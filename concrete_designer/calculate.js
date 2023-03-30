module.exports = function (input_json) {

    let {fy, fc, fyt, b, h, db ,ds, C_c} = input_json;

    var prettyPrint = function (val, decimal) {
      if (typeof val == "undefined" || val == null) return "-";
      val = parseFloat(val);
      if (!decimal) decimal = 3;
      var res = ReportHelpers.round(val, decimal);
      if (isNaN(res)) return val;
      return res;
    };

    function calculateAs(Mu, fc, fy, b, d ) {
        let a = 20;
        let phi_flexure = 0.9;
        let As;

        // iterate until convergence of a
        for (let i = 0; i < 20; i ++) {
            As = (Mu)/(phi_flexure*fy*(d - a*0.5));
            // check val of a
            a = (As*fy)/(0.85*fc*b);
        }

        return As;
    }

    class Rebar {
        constructor(rebarNo){ 
            let rebars = {
                "3": {"db": 0.375,"As": 0.11, "unit": "in"},
                "4": {"db": 0.5,"As": 0.20, "unit": "in"},
                "5": {"db": 0.625,"As": 0.31, "unit": "in"},
                "6": {"db": 0.75,"As": 0.44, "unit": "in"},
                "7": {"db": 0.875,"As": 0.6, "unit": "in"},
                "8": {"db": 1,"As": 0.79, "unit": "in"},
                "9": {"db": 1.128,"As": 1, "unit": "in"},
                "10": {"db": 1.27,"As": 1.27, "unit": "in"},
                "11": {"db": 1.41,"As": 1.56, "unit": "in"},

                "#3": {"db": 0.375,"As": 0.11, "unit": "in"},
                "#4": {"db": 0.5,"As": 0.20, "unit": "in"},
                "#5": {"db": 0.625,"As": 0.31, "unit": "in"},
                "#6": {"db": 0.75,"As": 0.44, "unit": "in"},
                "#7": {"db": 0.875,"As": 0.6, "unit": "in"},
                "#8": {"db": 1,"As": 0.79, "unit": "in"},
                "#9": {"db": 1.128,"As": 1, "unit": "in"},
                "#10": {"db": 1.27,"As": 1.27, "unit": "in"},
                "#11": {"db": 1.41,"As": 1.56, "unit": "in"}
                // "14": {"db": 1.693,"As": 2.25, "unit": "in"},
                // "18": {"db": 2.257,"As": 4.00, "unit": "in"}
            };

            this.db = rebars[rebarNo].db
            this.Ab = rebars[rebarNo].Ab

        }
    }

    class Beam {
        constructor (beamWidth, beamDepth, concreteStrengthfc, mainReinfYieldfy,  transverseReinfYieldfyt, mainReinfDiaRebarNo, transvereReinfDiaRebarNo, concreteCoverCc) {
            this.b =  beamWidth;
            this.h =  beamDepth;
            this.fc =  concreteStrengthfc;
            this.fy =  mainReinfYieldfy;
            this.fyt =  transverseReinfYieldfyt;

            let main_reinforcement = new Rebar(mainReinfDiaRebarNo)
            let transverse_reinforcement = new Rebar(transvereReinfDiaRebarNo)
            this.db =  main_reinforcement.db;
            this.ds =  transverse_reinforcement.db;
            this.cc = concreteCoverCc;
            this.d_prime = this.cc + this.ds + this.db*0.5;
            this.d = this.h - this.d_prime;
        }
        calculateFlexureReinforcement(designMomentMu) {
            // designMomentMu in lb-in
            let As = calculateAs(designMomentMu, this.fc, this.fy, this.b, this.d );
            return As;
        }
    }



    var beam1 = new Beam(b,h,fc,fy,fyt,db,ds,C_c)
    
    // Reusable function for generating table
    function generateResultsTable (header, data, options) {
      let table_data = [...header, ...data];
      options.text_aligns = "center";
      ReportHelpers.quickTable(table_data, options);
    }
  
    function generateAllResults (summaryTable, showImages, fy, fc) {
      let straight_ld_data = [];
      let hook_90deg_bend_data = [];
      let hook_180deg_bend_data = [];
      let splice_data = [];
      let stirrup_geometry_data = [];
  
      summaryTable.map(obj => {
        let {
          rebar_name,
          rebar_diameter,
          rebar_area,
          ld_top,
          ld_bottom,
          ldh,
          bend_geometry_tension,
          ldc, 
          lsc, 
          lst,
          stirrup_geometry
        } = obj;
  
        splice_data.push([
          rebar_name,
          rebar_diameter,
          prettyPrint(lsc,2),
          prettyPrint(lst.A,2),
          prettyPrint(lst.B,2)
        ]);
  
        hook_90deg_bend_data.push([
          rebar_name,
          rebar_diameter,
          prettyPrint(ldh,2),
          prettyPrint(bend_geometry_tension['90'].l_ext,2),
          prettyPrint(bend_geometry_tension['90'].inside_diameter,2),
        ]);
  
        hook_180deg_bend_data.push([
          rebar_name,
          rebar_diameter,
          prettyPrint(ldh,2),
          prettyPrint(bend_geometry_tension['180'].l_ext,2),
          prettyPrint(bend_geometry_tension['180'].inside_diameter,2),
        ]);
  
  
        straight_ld_data.push([
          rebar_name,
          rebar_diameter,
          prettyPrint(ld_top,2),
          prettyPrint(ld_bottom,2),
          prettyPrint(ldc,2)
        ]);
  
        if (stirrup_geometry) {
          stirrup_geometry_data.push([
            rebar_name,
            rebar_diameter,
            prettyPrint(stirrup_geometry['90'].l_ext,2),
            prettyPrint(stirrup_geometry['90'].inside_diameter,2),
            prettyPrint(stirrup_geometry['135'].l_ext,2),
            prettyPrint(stirrup_geometry['135'].inside_diameter,2),
            prettyPrint(stirrup_geometry['180'].l_ext,2),
            prettyPrint(stirrup_geometry['180'].inside_diameter,2),
          ]);
        }
  
      });
  
      // Generate development length summary table for straight bars
      let straight_ld_data_header = [
        [
          "Rebar", 
          "Bar Dia.<br>in.", 
          "Top Bars<br>Tension<br>l<sub>d</sub> in.",
          "Bottom Bars<br>Tension<br>l<sub>d</sub> in.",
          "Compression<br>l<sub>dc</sub> in.", 
        ]
      ];
      
      generateResultsTable (straight_ld_data_header, straight_ld_data, {heading: `Development Length for fy = ${fy} psi and f'c = ${fc} psi`,});
  
      if (showImages) {
        ReportHelpers.image({
          new_block: true,
          src: ld_image_beam,
          width: "80%"
        });
    
        // ldc
        ReportHelpers.image({
          new_block: true,
          src: ldc_image,
          width: "60%"
        });
      }
     
      // Generate development length summary table for hooked bars
      let hook_90deg_bend_data_header = [
        [
          "Rebar", 
          "Bar Dia.<br>in.",
          "Hook<br>l<sub>dh</sub> in.",
          "90&deg Hook<br>l<sub>ext</sub> in.", 
          "90&deg<br>Inside Dia.<br>D in.", 
        ]
      ];
  
      let hook_180deg_bend_data_header = [
        [
          "Rebar", 
          "Bar Dia.<br>in.",
          "Hook<br>l<sub>dh</sub> in.",
          "180&deg Hook<br>l<sub>ext</sub> in.", 
          "180&deg<br>Inside Dia.<br>D in."
        ]
      ];
  
      generateResultsTable (hook_90deg_bend_data_header, hook_90deg_bend_data, {heading: `90&deg Hook Development Length and Geometry for deformed bars in tension<br><br> fy = ${fy} psi and f'c = ${fc} psi`,});
      
      if (showImages) {
        // add hook figure
        ReportHelpers.image({
          new_block: true,
          src: hook_90deg_img,
          width: "60%"
        });
      }
      
      generateResultsTable (hook_180deg_bend_data_header, hook_180deg_bend_data, {heading: `180&deg Hook Development Length and Geometry deformed bars in tension<br><br> fy = ${fy} psi and f'c = ${fc} psi`,});
      
      if (showImages) {
        // add hook figure
        ReportHelpers.image({
          new_block: true,
          src: hook_180deg_img,
          width: "60%"
        });
      }
      
      // Generate standard hook geometry for stirrups
      let stirrup_geometry_data_header = [
        [
          "Rebar", 
          "Bar Dia.<br>in.",
          "90&deg Hook<br>l<sub>ext</sub> in.", 
          "90&deg<br>Inside Dia.<br>D in.",
          "135&deg Hook<br>l<sub>ext</sub> in.", 
          "135&deg<br>Inside Dia.<br>D in.",
          "180&deg Hook<br>l<sub>ext</sub> in.", 
          "180&deg<br>Inside Dia.<br>D in.",
        ]
      ]; 
  
      generateResultsTable (stirrup_geometry_data_header, stirrup_geometry_data, {heading: `Standard hook geometry for stirrups, ties, and hoops<br><br>fy = ${fy} psi and f'c = ${fc} psi`,});
  
      if (showImages) {
        ReportHelpers.image({
          new_block: true,
          src: stirrup_bend_90,
          width: "60%"
        });
    
        // add hook figure
        ReportHelpers.image({
          new_block: true,
          src: stirrup_bend_135,
          width: "60%"
        });
    
        // add hook figure
        ReportHelpers.image({
          new_block: true,
          src: stirrup_bend_180,
          width: "60%"
        });
      }
      
      // Generate splice length table summary for each rebar
      let splice_data_header = [
        [
          "Rebar", 
          "Bar Dia.<br>in.",
          "Splice length<br>(compression)<br>l<sub>sc</sub> in.", 
          "Class A <br>splice length<br>(tension)<br>l<sub>st</sub> in.", 
          "Class B <br>splice length<br>(tension)<br>l<sub>st</sub> in.",
        ]
      ];
  
      generateResultsTable (splice_data_header, splice_data, {heading: `Splice Length for fy = ${fy} psi and f'c = ${fc} psi`,});
      
      if (showImages) {
        // Compression splice
        ReportHelpers.image({
          new_block: true,
          src: lst_image,
          width: "100%"
        });
  
        // Compression splice
        ReportHelpers.image({
          new_block: true,
          src: lsc_image,
          width: "60%"
        });
      }
  
    }
  
    // TITLE
    REPORT.block.new("Development and Splice Length of Deformed Bars<br><br>(ACI 318-19)", 2);
    REPORT.block.finish();
  
    // Create Rebar Detail using from fy, fc, lambda
    var rebar_data = new RebarDetails(fy, fc, lambda, condition);
    
    // Generate Summary table 
    var summary_table_data = rebar_data.generateSummaryTableData(psi_e, psi_r, psi_o);
  
    generateAllResults(summary_table_data, true, fy, fc)
  
    REPORT.block.finish();
    REPORT.section.break();
  
    // CALCULATE development and splice length for the specifed rebar diameter
    let db_detail = rebar_data.generateCalcs(db, psi_e, false, psi_r, psi_o, true);
  
    var output = {
      results: {
        "Development and Splice Length": {
          "label": `For ${db} - ${rebar_data.getdb(db)} in.`, 
          "units": "heading",
        },
        "ldh": {
          "label":"Hook Development Length l<sub>dh</sub>",
          "value": db_detail.ldh,
          "units": "in",
        },
        "ldh_seismic": {
          "label":"Hook Development Length for Seismic l<sub>dh</sub>",
          "value": db_detail.ldh_seismic,
          "units": "in",
        },
        "ld_top": {
          "label":"Tension Development Length (top bars) l<sub>d,top</sub>",
          "value": db_detail.ld_top,
          "units": "in",
          "info": "With more than 12 in. of fresh concrete placed below the horizontal reinforcement",
        },
        "ld_bottom": {
          "label":"Tension Development Length (bottom bars) l<sub>d,bottom</sub>",
          "value": db_detail.ld_bottom,
          "units": "in",
        },
        "ldc": {
          "label":"Compression Development Length l<sub>dc</sub>",
          "value": db_detail.ldc,
          "units": "in",
        },
        "lst_A": {
          "label":"Tension Lap Splice Class A l<sub>st,A</sub>",
          "value": db_detail.lst.A,
          "units": "in",
        },
        "lst_B": {
          "label":"Tension Lap Splice Class B l<sub>st,B</sub>",
          "value": db_detail.lst.B,
          "units": "in",
        },
        "lsc": {
          "label":"Compression Lap Splice l<sub>sc</sub>",
          "value": db_detail.lsc,
          "units": "in",
        },
  
      },
      report: REPORT,
    };
  
    return output;
  
  };
  