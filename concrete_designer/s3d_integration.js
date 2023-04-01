module.exports = function(s3d_model, analysis_results) {

    if (!analysis_results)  throw new Error("No Analysis Results. Please solve model first.");

    let s3d_units = s3d_model.settings.units;
    let materials = s3d_model.materials;
    let default_input = {
        "beam_mark": "1",
        "fy": "40000",
        "fyt": "40000",
        "fc": "3000",
        "b": 10,
        "h": 20,
        "db": "#5",
        "ds": "#3",
        "C_c": 1.6,
        "Mu_topA": 100,
        "Mu_botA": 100,
        "Mu_top_mid": 100,
        "Mu_bot_mid": 100,
        "Mu_topB": 100,
        "Mu_botB": 100
    };

    let envelope_min_Mz = null;
    let envelope_max_Mz = null;
    let envelope_abs_Vy = null;
    let envelope_abs_Tu = null;

    for (let i = 0; i < analysis_results.length; i++ ) {
        let obj = analysis_results[i];
        if (obj && obj.type == 'envelope' && (obj.name == 'Envelope Min' || obj.name == 'Envelope+Min')) envelope_min_Mz = obj.bmd_z;
        if (obj && obj.type == 'envelope' && (obj.name == 'Envelope Max' || obj.name == 'Envelope+Max')) envelope_max_Mz = obj.bmd_z;
        if (obj && obj.type == 'envelope' && (obj.name == 'Envelope Absolute Max' || obj.name == 'Envelope+Absolute+Max')) {
            envelope_abs_Tu = obj.torsion;
            envelope_abs_Vy = obj.sfd_y;
        } 
    }
    

    // Get all vertical members
    // let columns_arr = S3D.grouping.members.byVector({
    //     structure: s3d_model,
    //     unfiltered_ids: null,
    //     vector: [0, 1, 0], tol: 5
    // });
    

    let columns_arr = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38];

    var members = s3d_model.elements;

    let design_members = [];

    function getDesignMomentsMu (MzArrEnveMin, MzArrEnveMax) {

        let Mz_midspan_max = [];
        let Mz_midspan_min = [];

        for (let i = 2; i < MzArrEnveMin.length-2; i++) {
            let mz_min = MzArrEnveMin[i];
            mz_min = (typeof mz_min == 'object') ? mz_min[1] : mz_min;

            let mz_max = MzArrEnveMax[i];
            mz_max = (typeof mz_max == 'object') ? mz_max[1] : mz_max;

            Mz_midspan_min.push(mz_min);
            Mz_midspan_max.push(mz_max);
        }
        
        let res = {
            'Mu_topA': Math.min(MzArrEnveMin[0], MzArrEnveMin[1], MzArrEnveMin[2]),
            'Mu_botA': Math.min(MzArrEnveMax[0], MzArrEnveMax[1], MzArrEnveMax[2]),
            'Mu_topB': Math.min(MzArrEnveMin[MzArrEnveMin.length-1], MzArrEnveMin[MzArrEnveMin.length-2], MzArrEnveMin[MzArrEnveMin.length-3]),
            'Mu_botB': Math.min(MzArrEnveMax[MzArrEnveMax.length-1], MzArrEnveMax[MzArrEnveMax.length-2], MzArrEnveMax[MzArrEnveMax.length-3]),
            'Mu_top_mid': Math.min(...Mz_midspan_min),
            'Mu_bot_mid': Math.max(...Mz_midspan_max),
        };

        return res;
    }

    function getDesignShearsVu (VzArrAbsMax) {
        let processedVz = VzArrAbsMax.map(val => {
            let res = (typeof val == 'object') ? val[1] : val;
            return res;
        })
        processedVz = processedVz.map(val => Math.abs(val))
        processedVz = Math.max(...processedVz)
        return processedVz;
    }

    for (let id = 1; id < members.length; id++) {
        if (columns_arr.indexOf(id) == -1 && envelope_min_Mz && envelope_max_Mz && envelope_abs_Vy) {
            let beamID = String(id);
            let this_member_input = JSON.parse(JSON.stringify(default_input)); //start with this
            let this_member = members[id];
            if (!this_member) continue;

            this_member_input.beam_mark = beamID;

            // ENVELOPE MOMENTS
            let this_Mz_min = envelope_min_Mz[beamID];
            let this_Mz_max = envelope_max_Mz[beamID];

            let {Mu_topA, Mu_botA, Mu_topB, Mu_botB, Mu_top_mid, Mu_bot_mid} = getDesignMomentsMu(this_Mz_min, this_Mz_max);

            // CALCULATE FLEXURE REINFORCEMENTS
            Mu_botA = (Mu_botA < 0) ? 0 : Mu_botA;
            Mu_botB = (Mu_botB < 0) ? 0 : Mu_botB;
            Mu_top_mid = (Mu_top_mid > 0) ? 0 : Mu_top_mid;

            this_member_input.Mu_topA = Math.round(Mu_topA*100)/100;
            this_member_input.Mu_botA = Math.round(Mu_botA*100)/100;
            this_member_input.Mu_topB = Math.round(Mu_topB*100)/100;
            this_member_input.Mu_botB = Math.round(Mu_botB*100)/100;
            this_member_input.Mu_top_mid = Math.round(Mu_top_mid*100)/100;
            this_member_input.Mu_bot_mid = Math.round(Mu_bot_mid*100)/100;

            // GET SECTION DIMENSIONS
            let section_id = this_member[2];
            let section_obj = s3d_model.sections[section_id];
            if (section_obj.aux.depth) this_member_input.d = UnitHelpers.convert(section_obj.aux.depth, s3d_units.section_length, "in");
            if (section_obj.aux.width) this_member_input.b = UnitHelpers.convert(section_obj.aux.width, s3d_units.section_length, "in");

            // CALCULATE SHEAR REINFORCEMENTS
            let this_Vy_abs = envelope_abs_Vy[beamID];
            let this_Tu_abs = envelope_abs_Tu[beamID];
            this_Vy_abs =  getDesignShearsVu(this_Vy_abs);
            this_Tu_abs =  getDesignShearsVu(this_Tu_abs);
            this_member_input.Vu = Math.round(this_Vy_abs*100)/100; 
            this_member_input.Vu_location = 0

            design_members.push(this_member_input);
        } 
    }


    if (design_members.length == 0) { //always a good idea - tell the user why this could be the case
        throw new Error("No Members Imported");
    }

    return design_members;

}
