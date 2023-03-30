module.exports = function(s3d_model, analysis_results) {

    if (!analysis_results)  throw new Error("No Analysis Results. Please solve model first.");

    let s3d_units = s3d_model.settings.units;
    let materials = s3d_model.materials;
    let default_input = {"L":0,"b":null,"d":null,"t1":2.5,"t2":4.5,"J":0,"welded":"No","alloy":"6005","temper":"T5","Mz":1800000,"My":500000,"Vz":20000,"Vy":20000,"Nc":0,"Nt":20000}

    let all_design_forces = StructureHelpers.getDesignForces(analysis_results);

    let design_members = [];
    var members = s3d_model.elements;
    for (var i =0; i < members.length; i++) {
        var this_member = members[i];
        if (!this_member) continue;

        let this_member_input = JSON.parse(JSON.stringify(default_input)); //start with this
        let span_L = StructureHelpers.getMemberLength(s3d_model, i);
        let design_forces = all_design_forces[i];

        this_member_input.L = UnitHelpers.convert(span_L, s3d_units.length, "mm");
        this_member_input.Mz = UnitHelpers.convert(design_forces.Mz_abs, s3d_units.moment, "N-mm");
        this_member_input.My = UnitHelpers.convert(design_forces.My_abs, s3d_units.moment, "N-mm");
        this_member_input.Vz = UnitHelpers.convert(design_forces.Vz_abs, s3d_units.force, "N");
        this_member_input.Vy = UnitHelpers.convert(design_forces.Vy_abs, s3d_units.force, "N");
        this_member_input.Nc = UnitHelpers.convert(design_forces.Vx_pos, s3d_units.force, "N");
        this_member_input.Nt =  UnitHelpers.convert(design_forces.Vx_neg, s3d_units.force, "N");

        //sections data
        let section_id = this_member[2];
        let section_obj = s3d_model.sections[section_id];
        let material_id = section_obj.material_id;
        this_member_input.J = UnitHelpers.convert(section_obj.J, s3d_units.section_length+"^4", "mm^4");

        let shape = section_obj.aux.polygons[0].shape;
        let dims = section_obj.aux.polygons[0].dimensions;
        this_member_input.t1 = "";
        this_member_input.t2 = "";

        if (shape == "hollow rectangle") {
            this_member_input.shape = "hollow rectangular";
            this_member_input.s3d_section = section_id;
            this_member_input.legs = 2;
            this_member_input.b = UnitHelpers.convert(dims.b.value, s3d_units.section_length, "mm");
            this_member_input.d = UnitHelpers.convert(dims.h.value, s3d_units.section_length, "mm");
            this_member_input.t1 = UnitHelpers.convert(dims.t.value, s3d_units.section_length, "mm");
            this_member_input.t2 = UnitHelpers.convert(dims.tb.value, s3d_units.section_length, "mm");
        } else {
            this_member_input.shape = "custom";
            this_member_input.s3d_section = section_id;
            if (section_obj.aux.depth) this_member_input.d = UnitHelpers.convert(section_obj.aux.depth, s3d_units.section_length, "mm");
            if (section_obj.aux.width) this_member_input.b = UnitHelpers.convert(section_obj.aux.width, s3d_units.section_length, "mm");
            if (section_obj.aux.polygons[0] && section_obj.aux.polygons[0].alum) {
                var alum_obj = section_obj.aux.polygons[0].alum;
                if (alum_obj.hasOwnProperty("number_of_legs")) this_member_input.legs = alum_obj.number_of_legs;
                if (alum_obj.hasOwnProperty("leg_thickness")) this_member_input.t1 = UnitHelpers.convert(alum_obj.leg_thickness, s3d_units.section_length, "mm");
                if (alum_obj.hasOwnProperty("leg_height")) this_member_input.d = UnitHelpers.convert(alum_obj.leg_height, s3d_units.section_length, "mm");
            } 
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

}
