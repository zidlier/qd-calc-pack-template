const { head } = require("request");

module.exports = function (input_json) {

  let {fy, fc, lambda, psi_e,psi_r, psi_o} = input_json;

  var prettyPrint = function (val, decimal) {
    if (typeof val == "undefined" || val == null) return "-";
    val = parseFloat(val);
    if (!decimal) decimal = 3;
    var res = ReportHelpers.round(val, decimal);
    if (isNaN(res)) return val;
    return res;
  };

  var customBlock = function (obj, pagebreak, REPORT) {
    let font_size = obj.font_size ? obj.font_size : 3;
    REPORT.block.new(obj.title, font_size);
    if (obj.reference) REPORT.block.addReference(obj.reference); // by default references are aligned to the top of a block
    if (obj.content) REPORT.block.addCalculation(obj.content);
    if (obj.result) REPORT.block.addResult(obj.result); // by default results are aligned to the bottom of a block
    REPORT.block.finish();
    if (pagebreak) REPORT.section.break();
  };

  class RebarDetails {
    constructor(fy, fc, lambda, generateDetailedReport) {
      this.fy = fy;
      this.fc = fc;
      this.lambda = lambda;

      if (typeof generateDetailedReport == 'undefined') generateDetailedReport = false; 
      this.generateDetailedReport = generateDetailedReport;
      this.generateCalcReport = true;

      let rebars = {
        "3": {"db": 0.375,"As": 0.11, "unit": "in"},
        "4": {"db": 0.5,"As": 0.20, "unit": "in"},
        "5": {"db": 0.625,"As": 0.31, "unit": "in"},
        "6": {"db": 0.75,"As": 0.44, "unit": "in"},
        "7": {"db": 0.875,"As": 0.6, "unit": "in"},
        "8": {"db": 1,"As": 0.79, "unit": "in"},
        "9": {"db": 1.128,"As": 1, "unit": "in"},
        "10": {"db": 1.27,"As": 1.27, "unit": "in"},
        "11": {"db": 1.41,"As": 1.56, "unit": "in"}
        // "14": {"db": 1.693,"As": 2.25, "unit": "in"},
        // "18": {"db": 2.257,"As": 4.00, "unit": "in"}
      };

      this.rebars = rebars;

      let min_rebar_hook_in_tension = {}; // From table 25.3.1
      let min_rebar_hook_stirrups = {}; // From table 25.3.2

      for (let rebarNo in rebars) {
        let {db} = rebars[rebarNo];
        let rebarNo_ = parseInt(rebarNo);
        let dia_90 = (rebarNo_ <= 8) ? 6*db : (rebarNo_ >= 14) ? 10*db : 8*db;
        let lext_90 = 12*db;
        let dia_180 = (rebarNo_ <= 8) ? 6*db : (rebarNo_ >= 14) ? 10*db : 8*db;
        let lext_180 = Math.max(4*db, 2.5);
        min_rebar_hook_in_tension[rebarNo] = {
          '90': {
            "inside_diameter": dia_90,
            "l_ext": lext_90
          },
          "180": {
            "inside_diameter": dia_180,
            "l_ext": lext_180
          }
        };

        if (rebarNo_ <= 8) {
          let stir_dia_90 = (rebarNo_ <= 5) ? 4*db : 6*db;
          let stir_lext_90 = (rebarNo_ <= 5) ? Math.max(6*db, 3) : 12*db;
          let stir_dia_180 = (rebarNo_ <= 5) ? 4*db : 6*db;
          let stir_lext_180 = Math.max(4*db, 2.5);
          let stir_dia_135 = (rebarNo_ <= 5) ? 4*db : 6*db;
          let stir_lext_135 = Math.max(6*db, 3);

          min_rebar_hook_stirrups[rebarNo] = {
            '90': {
              "inside_diameter": stir_dia_90,
              "l_ext": stir_lext_90
            },
            '135': {
              "inside_diameter": stir_dia_135,
              "l_ext": stir_lext_135
            },
            "180": {
              "inside_diameter": stir_dia_180,
              "l_ext": stir_lext_180
            }
          };
        }

      }
      
      this.min_rebar_hook_in_tension = min_rebar_hook_in_tension;
      this.min_rebar_hook_stirrups = min_rebar_hook_stirrups;

    }
    generateCalcs(rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement, confiningReinfModFactor, locationModFactor) {
      this.generateCalcReport = true;

      REPORT.block.new(`For Rebar #${rebarNo} - ${this.getdb(rebarNo)} in.:`);
      epoxyModFactor = parseFloat(epoxyModFactor);

      // REPORT.block.addCalculation(`Standard Hook Geometry for Development of Deformed bars in Tension:`);
      // this.getMinStandardHookInTension(rebarNo, '90');
      // this.getMinStandardHookInTension(rebarNo, '180');

      // let this_rebar_data = this.min_rebar_hook_stirrups[rebarNo];
      // if (this_rebar_data) {
      //   REPORT.block.addCalculation(`Minimum inside bend diameters and standard hook geometry for stirrups, ties, and hoops`);
      //   this.getMinStandardHookForStirrups(rebarNo, '90');
      //   this.getMinStandardHookForStirrups(rebarNo, '135');
      //   this.getMinStandardHookForStirrups(rebarNo, '180');
      // }
      
      let {ld, ld_othercase} = this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement);
      let ldh = this.calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor, locationModFactor);
      let ldc = this.calculateDevelopmentLengthInCompression (rebarNo, confiningReinfModFactor);

      let lst_obj = this.calculateLapSpliceInTension(rebarNo, ld, ld_othercase);

      let lsc;
      if (lst_obj) lsc = this.calculateLapSpliceInCompression(rebarNo, lst_obj.code_conforming.A);

      let ldh_seismic = this.calculateSeismicDevelopmentLengthOfHookInTension(rebarNo);
      // {
      //   'code_conforming': {"A": lst_A, "B": lst_B},
      //   'other': {"A": lst_A_othercases, "B": lst_B_othercases},
      // };

      REPORT.block.finish();
      REPORT.section.break();
    }
    getdb (rebarNo) {
      return this.rebars[rebarNo].db;
    }
    getMinStandardHookInTension(rebarNo, hookType) {
      let this_rebar_data = this.min_rebar_hook_in_tension[rebarNo];
      let hook_type_name = `${hookType}&deg hook`;
      if (this.generateDetailedReport && this.generateCalcReport) {
        ReportHelpers.lineResult(`Min. inside bend diameter (${hook_type_name})`, "D", prettyPrint(this_rebar_data[hookType].inside_diameter) + " in.");
        ReportHelpers.lineResult(`Straight extension (${hook_type_name})`, "l_{ext}", prettyPrint(this_rebar_data[hookType].l_ext) + " in.");
      }
      return this_rebar_data[hookType];
    }
    getMinStandardHookForStirrups (rebarNo, hookType) {
      let this_rebar_data = this.min_rebar_hook_stirrups[rebarNo];
      if (!this_rebar_data) return null;
      let hook_type_name = `${hookType}&deg hook`;
      if (this.generateDetailedReport && this.generateCalcReport) {
        ReportHelpers.lineResult(`Min. inside bend diameter (${hook_type_name})`, "D", prettyPrint(this_rebar_data[hookType].inside_diameter) + " in.");
        ReportHelpers.lineResult(`Min. straight extension (${hook_type_name})`, "l_{ext}", prettyPrint(this_rebar_data[hookType].l_ext) + " in.");
      }
      return this_rebar_data[hookType];
    }
    calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement) {
      
      // From Table 25.4.2.3
      if (!epoxyModFactor) epoxyModFactor = 1.0;
      if (!moreThan12InPlacedBelowHorizontalReinforcement) moreThan12InPlacedBelowHorizontalReinforcement = false;
      let rebar_no_ = parseInt(rebarNo);
      // From table 25.4.2.5
      let psi_g = (this.fy <= 60000) ? 1.0 : (this.fy >= 80000) ? 1.15 : 1.3;
      let psi_t = (moreThan12InPlacedBelowHorizontalReinforcement) ? 1.3 : 1.0;
      let psi_s = (rebar_no_ >= 7) ? 1.0 : 0.8;
      let psi_e = epoxyModFactor;

      let psi_t_psi_e = psi_e*psi_t;
      psi_t_psi_e = (psi_t_psi_e > 1.7) ? 1.7 : psi_t_psi_e;

      let coefficient = (rebar_no_ <= 6 ) ? (1/25) : (1/20);
      let coefficient_mathjax = (rebar_no_ <= 6 ) ? 25 : 20;
      
      let ld_coeff = (coefficient*psi_t_psi_e*psi_g*this.fy)/(this.lambda*Math.pow(this.fc,0.5));
      // round ld_coeff to nearest whole number
      ld_coeff = Math.ceil(ld_coeff);

      // Calculate ld
      let ld = ld_coeff*this.getdb(rebarNo);
      let coefficient_othercase = (rebar_no_ <= 6 ) ? (3/50) : (3/40);
      let coefficient_othercase_mathjax = (rebar_no_ <= 6 ) ? `\\frac{50}{3}` : `\\frac{40}{3}`;
      let ld_coeff_othercase = (coefficient_othercase*psi_t_psi_e*psi_g*this.fy)/(this.lambda*Math.pow(this.fc,0.5));
      // round ld_coeff to nearest whole number
      ld_coeff_othercase = Math.ceil(ld_coeff_othercase);

      // Calculate ld
      let ld_othercase = ld_coeff_othercase*this.getdb(rebarNo);

      if (this.generateCalcReport) {
        if (this.generateDetailedReport) {
          // GENERATE CALCS in REPORT
          REPORT.block.addCalculation(`<h3>Development length in tension [mathin] l_{d} [mathin]:</h3> <br>Clear spacing of bars or wires being developed or lap spliced not less than [mathin] d_{b} [mathin], clear cover at least [mathin] l_{d} [mathin], and stirrups or ties throughout [mathin] l_{d} [mathin] not less than the Code minimum<br>or<br> Clear spacing of bars or wires being developed or lap spliced at least [mathin] 2d_{b} [mathin] and clear cover at least [mathin] d_{b} [mathin]`);
          REPORT.block.addReference(`Table 25.4.2.5`);
          ReportHelpers.lineResult("Modification factor for concrete", "\\lambda", this.lambda);
          ReportHelpers.lineResult("Modification factor for reinforcement grade", "\\psi_{g}", psi_g);
          ReportHelpers.lineResult("Modification factor for epoxy coating", "\\psi_{e}", psi_e);
          ReportHelpers.lineResult("Modification factor for casting position", "\\psi_{t}", psi_t);
          ReportHelpers.lineResult("Product of [mathin] \\psi_{t} \\psi_{e}[mathin] need not exceed 1.7", "\\psi_{t}\\psi_{e}", psi_t_psi_e);
          
          REPORT.block.addReference(`Table 25.4.2.3`);
          REPORT.block.addCalculation(`[math] l_{d} = \\frac{f_{y}\\psi_{t}\\psi_{e}\\psi_{g}}{${coefficient_mathjax} \\lambda \\sqrt{f'_{c}}} d_{b} [math]`);
          REPORT.block.addCalculation(`[math] l_{d} = \\frac{(${this.fy})(${psi_t_psi_e})(${psi_g})}{${coefficient_mathjax} (${this.lambda}) \\sqrt{ ${this.fc} }} d_{b} = ${ld_coeff} d_{b} = ${prettyPrint(ld, 2)} in. [math]`);
          REPORT.block.addCalculation(`Other Cases: [math] l_{d} = \\frac{f_{y}\\psi_{t}\\psi_{e}\\psi_{g}}{${coefficient_othercase_mathjax} \\lambda \\sqrt{f'_{c}}} d_{b} [math]`);
          REPORT.block.addCalculation(`[math] l_{d} = \\frac{(${this.fy})(${psi_t_psi_e})(${psi_g})}{${coefficient_othercase_mathjax} (${this.lambda}) \\sqrt{ ${this.fc} }} d_{b} = ${ld_coeff_othercase} d_{b} = ${prettyPrint(ld_othercase, 2)} in. [math]`);
        } else {
          ReportHelpers.lineResult("Development length in tension (code conforming)", "l_{d}", prettyPrint(ld, 2) +' in.');
          ReportHelpers.lineResult("Development length in tension (other cases)", "l_{d}", prettyPrint(ld_othercase, 2) +' in.');
        }
      }
      
      return {ld, ld_othercase};
    }
    calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor, locationModFactor) {
      
      // From Table 25.4.3.2
      if (!epoxyModFactor) epoxyModFactor = 1.0;
      if (!confiningReinfModFactor) confiningReinfModFactor = 1.0;

      let rebar_no_ = parseInt(rebarNo);

      let psi_r = confiningReinfModFactor;
      let psi_e = epoxyModFactor;
      let psi_o = locationModFactor;
      let psi_c = (this.fc < 6000) ? this.fc/15000 + 0.6 : 1.0;

      let ldh_coeff = (this.fy*psi_e*psi_r*psi_o*psi_c)/(55*this.lambda*Math.pow(this.fc,0.5));
      // round ld_coeff to nearest whole number
      ldh_coeff = Math.ceil(ldh_coeff);

      // Calculate ld
      let ldh = ldh_coeff*Math.pow(this.getdb(rebarNo),1.5);
      ldh = Math.max(8*this.getdb(rebarNo), 6, ldh);

      if (this.generateCalcReport) {
        if (this.generateDetailedReport) {
          // GENERATE CALCS in REPORT
          REPORT.block.addCalculation(`<h3>Development length of standard hooks in tension [mathin] l_{dh} [mathin]:</h3>`);
          REPORT.block.addReference(`Table 25.4.3.2`);
          ReportHelpers.lineResult("Modification factor for concrete", "\\lambda", this.lambda);
          ReportHelpers.lineResult("Modification factor for confining reinforcement", "\\psi_{r}", psi_r);
          ReportHelpers.lineResult("Modification factor for epoxy coating", "\\psi_{e}", psi_e);
          ReportHelpers.lineResult("Modification factor for location", "\\psi_{o}", psi_o);
          ReportHelpers.lineResult("Modification factor for concrete strength", "\\psi_{c}", prettyPrint(psi_c));
          REPORT.block.addCalculation(`[mathin] l_{dh} [mathin] shall be greater of:`);
          // Section 25.4.3.1
          REPORT.block.addReference(`Section 25.4.3.1`);
          REPORT.block.addCalculation(`
            [math] \\frac{f_{y}\\psi_{e}\\psi_{r}\\psi_{o}\\psi_{c}}{55 \\lambda \\sqrt{f'_{c}}} {d_{b}}^{1.5} [math]
            [math] 8d_{b} [math]
            [math] 6in. [math]
          `);
          
          REPORT.block.addCalculation(`[math] l_{dh} = \\frac{(${this.fy})(${psi_e})(${psi_r})(${psi_o})(${prettyPrint(psi_c)})}{ 55 (${this.lambda}) \\sqrt{ ${this.fc} }} {d_{b}}^{1.5} = ${ldh_coeff} {d_{b}}^{1.5} > 8 d_{b}, 6 = ${prettyPrint(ldh, 2)} in. [math]`);
  
        } else {
          ReportHelpers.lineResult("Development length of standard hooks in tension", "l_{dh}", prettyPrint(ldh, 2) +' in.');
        }
      }

      return ldh;
    }
    calculateDevelopmentLengthInCompression (rebarNo, confiningReinfModFactor) {

      if (!confiningReinfModFactor) confiningReinfModFactor = 1.0;
      let psi_r = confiningReinfModFactor;

      let ldc_1_coeff = (this.fy*psi_r)/(50*this.lambda*Math.pow(this.fc,0.5));
      let ldc_2_coeff = 0.0003*this.fy*psi_r;
      ldc_1_coeff = Math.ceil(ldc_1_coeff);
      ldc_2_coeff = Math.ceil(ldc_2_coeff);
      
      let ldc_1 = ldc_1_coeff*this.getdb(rebarNo);
      let ldc_2 = ldc_2_coeff*this.getdb(rebarNo);

      let ldc = Math.max(ldc_1, ldc_2, 8);

      if (this.generateCalcReport) {
        if (this.generateDetailedReport) {
          // GENERATE CALCS in REPORT
          REPORT.block.addCalculation(`<h3>Development length of deformed bars in compression [mathin] l_{dc} [mathin]:</h3>`);
          ReportHelpers.lineResult("Modification factor for concrete", "\\lambda", this.lambda);
          ReportHelpers.lineResult("Modification factor for confining reinforcement", "\\psi_{r}", psi_r);
          REPORT.block.addCalculation(`[mathin] l_{dc} [mathin] shall be greater of:`);
          // Section 25.4.9
          REPORT.block.addReference(`Section 25.4.9`);
          REPORT.block.addCalculation(`
            [math] \\frac{f_{y}\\psi_{r}}{50 \\lambda \\sqrt{f'_{c}}} d_{b} [math]
            [math] 0.0003 f_{y} \\psi_{r} d_{b} [math]
            [math] 8in. [math]
          `);
  
          REPORT.block.addCalculation(`[math] \\frac{f_{y}\\psi_{r}}{50 \\lambda \\sqrt{f'_{c}}} d_{b} = \\frac{(${this.fy})(${psi_r})}{50 (${this.lambda}) \\sqrt{ ${this.fc} } } d_{b} = ${ldc_1_coeff} d_{b} = ${prettyPrint(ldc_1,2)} in. [math]`);
          REPORT.block.addCalculation(`[math] 0.0003 (${this.fy})(${psi_r}) d_{b} = ${ldc_2_coeff} d_{b} = ${prettyPrint(ldc_2,2)} in. [math]`);
          REPORT.block.addCalculation(`[math] l_{dc} = ${prettyPrint(ldc,2)} in. [math]`);
        } else {
          ReportHelpers.lineResult("Development length of deformed bars in compression", "l_{dc}", prettyPrint(ldc, 2) +' in.');
        }
      }
     
      return ldc;
    }
    calculateLapSpliceInTension (rebarNo, ld, ldOtherCases) {
      let rebar_no_ = parseInt(rebarNo);
      if (rebar_no_ > 11) return null;
      // Table 25.5.2.1
      let lst_A = Math.max(12,1*ld);
      let lst_B = Math.max(12,1.3*ld);

      let lst_A_othercases = Math.max(12,1*ldOtherCases);
      let lst_B_othercases = Math.max(12,1.3*ldOtherCases);
      
      if (this.generateCalcReport) {
        if (this.generateDetailedReport) {
          // GENERATE CALCS in REPORT
          REPORT.block.addCalculation(`<h3>Lap Splice lengths of deformed bars in tension [mathin] l_{st} [mathin]:</h3>`);
          REPORT.block.addReference(`Table 25.5.2.1`); 
          REPORT.block.addCalculation(`Clear spacing of bars or wires being developed or lap spliced not less than [mathin] d_{b} [mathin], clear cover at least [mathin] l_{d} [mathin], and stirrups or ties throughout [mathin] l_{d} [mathin] not less than the Code minimum<br>or<br> Clear spacing of bars or wires being developed or lap spliced at least [mathin] 2d_{b} [mathin] and clear cover at least [mathin] d_{b} [mathin]`);
  
          ReportHelpers.lineResult("Development length in tension", "l_{d}", prettyPrint(ld,2) + ' in.');
          REPORT.block.addCalculation(`Class A: [math] l_{st,A} = 1.0l_{d} > 12 = ${prettyPrint(lst_A,2)} in. [math]`);
          REPORT.block.addCalculation(`Class B: [math] l_{st,A} = 1.3l_{d} > 12 = ${prettyPrint(lst_B,2)} in. [math]`);
          REPORT.block.addCalculation(`Other Cases:`);
          ReportHelpers.lineResult("Development length in tension", "l_{d}", prettyPrint(ldOtherCases,2) + ' in.');
          REPORT.block.addCalculation(`Class A: [math] l_{st,A} = 1.0l_{d} > 12 = ${prettyPrint(lst_A_othercases,2)} in. [math]`);
          REPORT.block.addCalculation(`Class B: [math] l_{st,A} = 1.3l_{d} > 12 = ${prettyPrint(lst_B_othercases,2)} in. [math]`);
        } else {
          ReportHelpers.lineResult("Development length in tension (code conforming - Class A)", "l_{d,A}", prettyPrint(lst_A,2) + ' in.');
          ReportHelpers.lineResult("Development length in tension (code conforming - Class B)", "l_{d,B}", prettyPrint(lst_B,2) + ' in.');
          ReportHelpers.lineResult("Development length in tension (other cases - Class A)", "l_{d,A}", prettyPrint(lst_A_othercases,2) + ' in.');
          ReportHelpers.lineResult("Development length in tension (other cases - Class B)", "l_{d,B}", prettyPrint(lst_B_othercases,2) + ' in.');
        }
      }
      
      return {
        'code_conforming': {"A": lst_A, "B": lst_B},
        'other': {"A": lst_A_othercases, "B": lst_B_othercases},
      };

    }
    calculateLapSpliceInCompression(rebarNo, lst) {
      
      let rebar_no_ = parseInt(rebarNo);
      if (rebar_no_ > 11) return null;

      let fy = this.fy;
      let fc = this.fc;
      let lsc;
      let db = this.getdb(rebarNo);


      if (fy <= 60000) {
        lsc = Math.max( 0.0005*fy*db, 12);
      } else if (fy > 60000 && fy <= 80000) {
        lsc = Math.max( (0.0009*fy-24)*db, 12);
      } else {
        lsc = Math.max( (0.0009*fy-24)*db, lst);
      }


      
      if (this.generateDetailedReport && this.generateCalcReport) {
        // GENERATE CALCS in REPORT
        REPORT.block.addCalculation(`<h3>Lap Splice lengths of deformed bars in compression [mathin] l_{sc} [mathin]:</h3>`);
        REPORT.block.addReference(`Section 25.5.5`);

        if (fy <= 60000) {
          REPORT.block.addCalculation(`For [mathin] f_{y} [mathin]: [math] l_{sc} = 0.0005 f_{y} d_{b} > 12 = ${prettyPrint(lsc,2)} in. [math]`);
        } else if (fy > 60000 && fy <= 80000) {
          REPORT.block.addCalculation(`For [mathin] f_{y} [mathin]: [math] l_{sc} = (0.0009 f_{y} - 24) d_{b} > 12 = ${prettyPrint(lsc,2)} in. [math]`);        
        } else {
          ReportHelpers.lineResult("Lap Splice lengths of deformed bars in tension", "l_{st}", prettyPrint(lst,2) + ' in.');
          REPORT.block.addCalculation(`For [mathin] f_{y} [mathin]: [math] l_{sc} = (0.0009 f_{y} - 24) d_{b} > l_{st} = ${prettyPrint(lsc,2)} in. [math]`);        
        }
      }
      

      if (fc < 3000) {
        lsc = lsc*(4/3);
        
        if (this.generateDetailedReport) {
          REPORT.block.addCalculation(`For [mathin] f'_{c} < 3000 psi [mathin]:
            [math] l_{sc} = \\frac{4 l_{sc}} {3} = ${prettyPrint(lsc,2)} in.[math]
          `);
        }
        
      } 

      if (!this.generateDetailedReport && this.generateCalcReport) ReportHelpers.lineResult("Lap Splice lengths of deformed bars in compression", "l_{st}", prettyPrint(lst,2) + ' in.');

      return lsc;
    }
    calculateSeismicDevelopmentLengthOfHookInTension (rebarNo) {
      
      let rebar_no_ = parseInt(rebarNo);

      // From Table 18.8.5.1
      if (rebar_no_ > 11) return null;

      let db = this.getdb(rebarNo);

      let ldh_coeff = (this.fy)/(65*this.lambda*Math.pow(this.fc,0.5));
      ldh_coeff = Math.ceil(ldh_coeff);
      let ldh = ldh_coeff*db;

      ldh = Math.max(8*db, 6, ldh);

      ReportHelpers.lineResult("Development length of hooks in tension (for seismic conditions)", "l_{dh}", prettyPrint(ldh, 2) +' in.');
      
      return ldh;
    }
    calculateSeismicDevelopmentLengthOfStraightBarInTension (rebarNo, topOrBottom, ldhSeismic, epoxyModFactor) {
      
      let rebar_no_ = parseInt(rebarNo);

      // From Table 18.8.5.1
      if (rebar_no_ > 11) return null;
      let F = (topOrBottom == 'top') ? 3.25 : 2.5;
      let ld = ldhSeismic*F*epoxyModFactor;

      ReportHelpers.lineResult("Development length of straight bars in tension (for seismic conditions)", "l_{d}", prettyPrint(ld, 2) +' in.');
      
      return ld;
    }
    generateSummaryTable(epoxyModFactor, confiningReinfModFactor, locationModFactor) {
      
      let rebars = this.rebars;
      epoxyModFactor = parseFloat(epoxyModFactor);
      this.generateDetailedReport = false;
      this.generateCalcReport = false;

      let rebar_data = [];

      for (let rebarNo in rebars) {

        let this_data = {};

        let this_db = this.getdb(rebarNo);
        this_data.rebar_name = `#${rebarNo}`;
        this_data.rebar_diameter = this_db;
        this_data.rebar_area = rebars[rebarNo].As;

        // top bars
        let ld_top = this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, true);
        
        // bottom
        let ld_bottom = this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, false);
        // {ld, ld_othercase}
        this_data.ld_top = ld_top.ld;
        this_data.ld_bottom = ld_bottom.ld;

        // ld hook
        this_data.ldh = this.calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor, locationModFactor);
        // ld compression
        this_data.ldc = this.calculateDevelopmentLengthInCompression (rebarNo, confiningReinfModFactor);
  
        let lst_obj = this.calculateLapSpliceInTension(rebarNo, ld_bottom.ld, ld_bottom.ld_othercase);

        this_data.lst = lst_obj.code_conforming;
        
        let lsc;
        if (lst_obj) {
          lsc = this.calculateLapSpliceInCompression(rebarNo, lst_obj.code_conforming.A);
          this_data.lsc = lsc;
        }

        let hook_bend_90 = this.getMinStandardHookInTension(rebarNo, '90');
        let hook_bend_180 = this.getMinStandardHookInTension(rebarNo, '180');
        this_data.bend_geometry = {
          '90': hook_bend_90,
          '180': hook_bend_180
        };

        rebar_data.push(this_data);
      }

      return rebar_data;
    }
  }

  // TITLE
  REPORT.block.new("Development and Splice Length of Deformed Bars<br><br>(ACI 318-19)", 2);
  REPORT.block.finish();

  var rebar_data = new RebarDetails(fy, fc, lambda);

  let rebars = rebar_data.rebars;

  for (let rebarNo in rebars) {
    rebar_data.generateCalcs(rebarNo, psi_e, false, psi_r, psi_o);
  }
  
  var summary_table_data = rebar_data.generateSummaryTable(psi_e, psi_r, psi_o);

  let straight_ld_data = [];
  let hook_bend_data = [];
  let splice_data = [];
  
  let converted_summary_table_data = summary_table_data.map(obj => {
    let {
      rebar_name,
      rebar_diameter,
      rebar_area,
      ld_top,
      ld_bottom,
      ldh,
      bend_geometry,
      ldc, 
      lsc, 
      lst
    } = obj;

    splice_data.push([
      rebar_name,
      rebar_diameter,
      prettyPrint(lsc,2),
      prettyPrint(lst.A,2),
      prettyPrint(lst.B,2)
    ]);

    hook_bend_data.push([
      rebar_name,
      rebar_diameter,
      prettyPrint(ldh,2),
      prettyPrint(bend_geometry['90'].l_ext,2),
      prettyPrint(bend_geometry['90'].inside_diameter,2),
      prettyPrint(bend_geometry['180'].l_ext,2),
      prettyPrint(bend_geometry['180'].inside_diameter,2),
    ]);

    straight_ld_data.push([
      rebar_name,
      rebar_diameter,
      prettyPrint(ld_top,2),
      prettyPrint(ld_bottom,2),
      prettyPrint(ldc,2)
    ]);

  });

  function generateSummaryTable (header, data, options) {
    let table_data = [...header, ...data];
    ReportHelpers.quickTable(table_data, options);
  }

  let straight_ld_data_header = [
    [
      "Rebar", 
      "Bar Dia.", 
      "Top Bars<br>l<sub>d</sub> in.",
      "Bottom Bars<br>l<sub>d</sub> in.",
      "Compression<br>l<sub>dc</sub> in.", 
    ]
  ];

  let hook_bend_data_header = [
    [
      "Rebar", 
      "Bar Dia.",
      "Hook<br>l<sub>dh</sub> in.",
      "90&deg Hook<br>l<sub>ext</sub> in.", 
      "90&deg<br>Inside Dia. in.", 
      "180&deg Hook<br>l<sub>ext</sub> in.", 
      "180&deg<br>Inside Dia. in."
    ]
  ];

  let splice_data_header = [
    [
      "Rebar", 
      "Bar Dia.",
      "Splice length<br>(compression)<br>l<sub>sc</sub> in.", 
      "Class A <br>splice length<br>(tension)<br>l<sub>st</sub> in.", 
      "Class B <br>splice length<br>(tension)<br>l<sub>st</sub> in.",
    ]
  ];

  generateSummaryTable (straight_ld_data_header, straight_ld_data, {heading: `Development Length for fy = ${fy} psi and f'c = ${fc} psi`,});
  generateSummaryTable (hook_bend_data_header, hook_bend_data, {heading: `Hook Development Length and Geometry for fy = ${fy} psi and f'c = ${fc} psi`,});
  generateSummaryTable (splice_data_header, splice_data, {heading: `Splice Length for fy = ${fy} psi and f'c = ${fc} psi`,});

  
  var output = {
    results: {
      sub_heading_1: {
        unit: "heading",
        label: "Length",
      },
      fy_fc: {
        "label": "Dummy Output",
        "value": fc*fy,
        "unit": "utility",
      }
    },
    report: REPORT,
  };

  return output;
};
