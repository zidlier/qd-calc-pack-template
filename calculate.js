module.exports = function (input_json) {

  let {fy, fc, lambda} = input_json;

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
    constructor(fy, fc, lambda) {
      this.fy = fy;
      this.fc = fc;
      this.lambda = lambda;

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
        "14": {"db": 1.693,"As": 2.25, "unit": "in"},
        "18": {"db": 2.257,"As": 4.00, "unit": "in"}
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
    generateCalcs(rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement, confiningReinfModFactor) {
      REPORT.block.new(`For #${rebarNo}:`);

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
      
      this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement);
      this.calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor)

      REPORT.block.finish();
    }
    getdb (rebarNo) {
      return this.rebars[rebarNo].db;
    }
    getMinStandardHookInTension(rebarNo, hookType) {
      let this_rebar_data = this.min_rebar_hook_in_tension[rebarNo];
      let hook_type_name = `${hookType}&deg hook`;
      ReportHelpers.lineResult(`Min. inside bend diameter (${hook_type_name})`, "D", prettyPrint(this_rebar_data[hookType].inside_diameter) + " in.");
      ReportHelpers.lineResult(`Straight extension (${hook_type_name})`, "l_{ext}", prettyPrint(this_rebar_data[hookType].l_ext) + " in.");
      return this_rebar_data[hookType];
    }
    getMinStandardHookForStirrups (rebarNo, hookType) {
      let this_rebar_data = this.min_rebar_hook_stirrups[rebarNo];
      if (!this_rebar_data) return null;
      let hook_type_name = `${hookType}&deg hook`;
      ReportHelpers.lineResult(`Min. inside bend diameter (${hook_type_name})`, "D", prettyPrint(this_rebar_data[hookType].inside_diameter) + " in.");
      ReportHelpers.lineResult(`Min. straight extension (${hook_type_name})`, "l_{ext}", prettyPrint(this_rebar_data[hookType].l_ext) + " in.");
      return this_rebar_data[hookType];
    }
    calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement) {
      
      // From Table 25.4.2.3
      if (!epoxyModFactor) epoxyModFactor = 1.0;
      if (!moreThan12InPlacedBelowHorizontalReinforcement) moreThan12InPlacedBelowHorizontalReinforcement = false;
      let rebar_no_ = parseInt(rebarNo);
      // From table 25.4.2.5
      let psi_g = (this.fy == 40000 || this.fy == 60000) ? 1.0 : (this.fy == 80000) ? 1.15 : 1.3;
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

      REPORT.block.addCalculation(`<h3>Development length in tension:</h3> <br>Clear spacing of bars or wires being developed or lap spliced not less than [mathin] d_{b} [mathin], clear cover at least [mathin] l_{d} [mathin], and stirrups or ties throughout [mathin] l_{d} [mathin] not less than the Code minimum<br>or<br> Clear spacing of bars or wires being developed or lap spliced at least [mathin] 2d_{b} [mathin] and clear cover at least [mathin] d_{b} [mathin]`);
      ReportHelpers.lineResult("Modification factor for concrete", "\\lambda", this.lambda);
      ReportHelpers.lineResult("Modification factor for reinforcement grade", "\\psi_{g}", psi_g);
      ReportHelpers.lineResult("Modification factor for epoxy coating", "\\psi_{e}", psi_e);
      ReportHelpers.lineResult("Modification factor for casting position", "\\psi_{t}", psi_t);
      ReportHelpers.lineResult("Product of [mathin] \\psi_{t} \\psi_{e}[mathin] need not exceed 1.7", "\\psi_{t}\\psi_{e}", psi_t_psi_e);
      REPORT.block.addCalculation(`[math] l_{d} = \\frac{f_{y}\\psi_{t}\\psi_{e}\\psi_{g}}{${coefficient_mathjax} \\lambda \\sqrt{f'_{c}}} d_{b} [math]`);
      REPORT.block.addCalculation(`[math] l_{d} = \\frac{(${this.fy})(${psi_t_psi_e})(${psi_g})}{${coefficient_mathjax} (${this.lambda}) \\sqrt{ ${this.fc} }} d_{b} = ${ld_coeff} d_{b} = ${prettyPrint(ld, 2)} in. [math]`);

      let coefficient_othercase = (rebar_no_ <= 6 ) ? (3/50) : (3/40);
      let coefficient_othercase_mathjax = (rebar_no_ <= 6 ) ? `\\frac{50}{3}` : `\\frac{40}{3}`;
      let ld_coeff_othercase = (coefficient_othercase*psi_t_psi_e*psi_g*this.fy)/(this.lambda*Math.pow(this.fc,0.5));
      // round ld_coeff to nearest whole number
      ld_coeff_othercase = Math.ceil(ld_coeff_othercase);

      // Calculate ld
      let ld_othercase = ld_coeff_othercase*this.getdb(rebarNo);

      REPORT.block.addCalculation(`Other Cases: [math] l_{d} = \\frac{f_{y}\\psi_{t}\\psi_{e}\\psi_{g}}{${coefficient_othercase_mathjax} \\lambda \\sqrt{f'_{c}}} d_{b} [math]`);
      REPORT.block.addCalculation(`[math] l_{d} = \\frac{(${this.fy})(${psi_t_psi_e})(${psi_g})}{${coefficient_othercase_mathjax} (${this.lambda}) \\sqrt{ ${this.fc} }} d_{b} = ${ld_coeff_othercase} d_{b} = ${prettyPrint(ld_othercase, 2)} in. [math]`);

      return {ld, ld_othercase};
    }
    calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor) {
      
      // From Table 25.4.3.2
      if (!epoxyModFactor) epoxyModFactor = 1.0;
      if (!confiningReinfModFactor) confiningReinfModFactor = 1.0;

      let rebar_no_ = parseInt(rebarNo);

      let psi_r = confiningReinfModFactor
      let psi_e = epoxyModFactor;
      let psi_o = 1.25
      let psi_c = (this.fc < 6000) ? this.fc/15000 + 0.6 : 1.0

      let ldh_coeff = (this.fy*psi_e*psi_r*psi_o*psi_c)/(55*this.lambda*Math.pow(this.fc,0.5));
      // round ld_coeff to nearest whole number
      ldh_coeff = Math.ceil(ldh_coeff);

      // Calculate ld
      let ldh = ldh_coeff*Math.pow(this.getdb(rebarNo),1.5);
      ldh = Math.max(8*this.getdb(rebarNo), 6, ldh)

      REPORT.block.addCalculation(`<h3>Development length of standard hooks in tension:</h3>`);
      ReportHelpers.lineResult("Modification factor for concrete", "\\lambda", this.lambda);
      ReportHelpers.lineResult("Modification factor for confining reinforcement", "\\psi_{r}", psi_r);
      ReportHelpers.lineResult("Modification factor for epoxy coating", "\\psi_{e}", psi_e);
      ReportHelpers.lineResult("Modification factor for location", "\\psi_{o}", psi_o);
      ReportHelpers.lineResult("Modification factor for concrete strength", "\\psi_{c}", psi_c);
      REPORT.block.addCalculation(`[math] l_{dh} = \\frac{f_{y}\\psi_{e}\\psi_{r}\\psi_{o}\\psi_{c}}{55 \\lambda \\sqrt{f'_{c}}} {d_{b}}^{1.5} > 8 d_{b}, 6 [math]`);
      REPORT.block.addCalculation(`[math] l_{dh} = \\frac{(${this.fy})(${psi_e})(${psi_r})(${psi_o})(${psi_c})}{ 55 (${this.lambda}) \\sqrt{ ${this.fc} }} {d_{b}}^{1.5} = ${ldh_coeff} {d_{b}}^{1.5} > 8 d_{b}, 6 = ${prettyPrint(ldh, 2)} in. [math]`);

      return ldh;
    }

  }


  // TITLE
  REPORT.block.new("<center>Development and Splice Length of Deformed Bars<br><br>(ACI 318-19)</center>", 2);
  REPORT.block.finish();

  var rebar_data = new RebarDetails(fy, fc, lambda);

  rebar_data.generateCalcs('3', 1.0, false, 1.0);

  // customBlock({
  //   title: "<h1>Development and Splice Length of Bars as per ACI 318-19</h1>", 
  //   font_size: 1, 
  //   reference: "",
  //   content: '',
  //   result: ''
  // }, false, REPORT);


  
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
