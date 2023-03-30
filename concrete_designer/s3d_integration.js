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
        "db": "#3",
        "ds": "#3",
        "C_c": 1.6,
        "Mu_topA": 100,
        "Mu_botA": 100,
        "Mu_top_mid": 100,
        "Mu_bot_mid": 100,
        "Mu_topB": 100,
        "Mu_botB": 100
    }

    let all_design_forces = StructureHelpers.getDesignForces(analysis_results);

    let beams = S3D.grouping.members.bySecName({
        structure: s3d_model,
        section: '400 x 275',
    });

    let design_members = [];
    var members = s3d_model.elements;

    for (var i =0; i < members.length; i++) {
        var this_member = members[i];
        if (!this_member) continue;
        if (!beams.hasOwnProperty(i)) continue;

        let this_member_input = JSON.parse(JSON.stringify(default_input)); //start with this
        let design_forces = all_design_forces[i];

        this_member_input.L = UnitHelpers.convert(span_L, s3d_units.length, "ft");
        this_member_input.Mz = UnitHelpers.convert(design_forces.Mz_abs, s3d_units.moment, "kip-ft");
        this_member_input.My = UnitHelpers.convert(design_forces.My_abs, s3d_units.moment, "kip-ft");
        this_member_input.Vz = UnitHelpers.convert(design_forces.Vz_abs, s3d_units.force, "kip");
        this_member_input.Vy = UnitHelpers.convert(design_forces.Vy_abs, s3d_units.force, "kip");

        //sections data
        let section_id = this_member[2];
        let section_obj = s3d_model.sections[section_id];
        
        let shape = section_obj.aux.polygons[0].shape;
        let dims = section_obj.aux.polygons[0].dimensions;
        this_member_input.t1 = "";
        this_member_input.t2 = "";

        if (shape == "hollow rectangle") {
           
        } else {
            this_member_input.shape = "custom";
            this_member_input.s3d_section = section_id;
            if (section_obj.aux.depth) this_member_input.d = UnitHelpers.convert(section_obj.aux.depth, s3d_units.section_length, "mm");
            if (section_obj.aux.width) this_member_input.b = UnitHelpers.convert(section_obj.aux.width, s3d_units.section_length, "mm");
            
        }

        if (!this_member_input.t2 && this_member_input.t1) this_member_input.t2 = this_member_input.t1; //just make them the same if blank

        //clean and round some data
        this_member_input.L = parseFloat(this_member_input.L.toFixed(0))
        this_member_input.J = parseFloat(this_member_input.J.toFixed(0))
        this_member_input.Mz = parseFloat(this_member_input.Mz.toFixed(0))
        this_member_input.My = parseFloat(this_member_input.My.toFixed(0))
        this_member_input.Vy = parseFloat(this_member_input.Vy.toFixed(0))
        this_member_input.Vz = parseFloat(this_member_input.Vz.toFixed(0))
        this_member_input.Nc = parseFloat(this_member_input.Nc.toFixed(0))
        this_member_input.Nt = parseFloat(this_member_input.Nt.toFixed(0))

        if (this_member_input.h) this_member_input.h = parseFloat(this_member_input.h.toFixed(0))
        if (this_member_input.b) this_member_input.b = parseFloat(this_member_input.b.toFixed(0))
        
        design_members[i] = this_member_input; //add to array

    }

    if (design_members.length == 0) { //always a good idea - tell the user why this could be the case
        throw new Error("No Members Imported. Check your materials are set to 'aluminum' and that the sections are hollow rectangular");
    }

    return design_members;


    var input_json = {
        "auth": "patrick@skyciv.com",
        "key": "YOUR API TOKEN, get this from https://platform.skyciv.com/api",
        "uid": "draft/uid8e326f3f13ec8",
        "input": {
            "beam_mark": "1",
            "fy": "40000",
            "fyt": "40000",
            "fc": "3000",
            "b": 10,
            "h": 20,
            "db": "#3",
            "ds": "#3",
            "C_c": 1.6,
            "Mu_topA": 100,
            "Mu_botA": 100,
            "Mu_top_mid": 100,
            "Mu_bot_mid": 100,
            "Mu_topB": 100,
            "Mu_botB": 100,
            "project_details": {
                "units": {
                    "project_units": ""
                },
                "project_company": "",
                "project_name": "",
                "project_designer": "",
                "project_id": "",
                "project_client": "",
                "project_notes": ""
            }
        }
    } 
                          

}
