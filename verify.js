class RebarDetails {
    constructor(fy, fc, lambda, spacingCoverCondition, generateDetailedReport) {
      
      this.fy = fy;
      this.fc = fc;
      this.lambda = lambda;
      this.condition = spacingCoverCondition

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
    generateCalcs(rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement, confiningReinfModFactor, locationModFactor, generateDetailedReport) {
      
      let rebar_name_ui = {
        '#3': "3",
        '#4': "4",
        '#5': "5",
        '#6': "6",
        '#7': "7",
        '#8': "8",
        '#9': "9",
        '#10': "10",
        '#11': "11"
      };
      
      if (isNaN(parseFloat(rebarNo))) rebarNo = rebar_name_ui[rebarNo];

      this.generateCalcReport = true;
      if (generateDetailedReport) this.generateDetailedReport = true;

      let this_db = this.getdb(rebarNo);

      epoxyModFactor = parseFloat(epoxyModFactor);
      let this_rebar_data = this.min_rebar_hook_stirrups[rebarNo];

      let ld = this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement);
      let ldh = this.calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor, locationModFactor);
      let ldh_seismic = this.calculateSeismicDevelopmentLengthOfHookInTension(rebarNo);

      let ldc = this.calculateDevelopmentLengthInCompression (rebarNo, confiningReinfModFactor);

      let lst_obj = this.calculateLapSpliceInTension(rebarNo, ld);

      let lsc;
      if (lst_obj) lsc = this.calculateLapSpliceInCompression(rebarNo, lst_obj.A);

      let result_temp = {};
      result_temp.rebar_name = `#${rebarNo}`;
      result_temp.rebar_diameter = this_db;

      // top bars
      result_temp.ld_top = this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, true);
      result_temp.ld_bottom = this.calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, false);

      // ld hook
      result_temp.ldh = ldh;
      result_temp.ldc = ldc;
      result_temp.lst = lst_obj;
      result_temp.lsc = lsc;
      result_temp.ldh_seismic = ldh_seismic;

      let hook_bend_90 = this.getMinStandardHookInTension(rebarNo, '90');
      let hook_bend_180 = this.getMinStandardHookInTension(rebarNo, '180');

      result_temp.bend_geometry_tension = {
        '90': hook_bend_90,
        '180': hook_bend_180
      };
      
      if (this_rebar_data) {
        result_temp.stirrup_geometry = {};
        result_temp.stirrup_geometry['90'] = this.getMinStandardHookForStirrups(rebarNo, '90');
        result_temp.stirrup_geometry['135'] = this.getMinStandardHookForStirrups(rebarNo, '135');
        result_temp.stirrup_geometry['180'] = this.getMinStandardHookForStirrups(rebarNo, '180');
      }

      return result_temp;

    }
    getdb (rebarNo) {
      return this.rebars[rebarNo].db;
    }
    getMinStandardHookInTension(rebarNo, hookType) {
      let this_rebar_data = this.min_rebar_hook_in_tension[rebarNo];
      let hook_type_name = `${hookType}&deg hook`;
      return this_rebar_data[hookType];
    }
    getMinStandardHookForStirrups (rebarNo, hookType) {
      let this_rebar_data = this.min_rebar_hook_stirrups[rebarNo];
      if (!this_rebar_data) return null;
      let hook_type_name = `${hookType}&deg hook`;
      return this_rebar_data[hookType];
    }
    calculateDevelopmentLengthInTension (rebarNo, epoxyModFactor, moreThan12InPlacedBelowHorizontalReinforcement) {
      
      // From Table 25.4.2.3
      if (!epoxyModFactor) epoxyModFactor = 1.0;
      if (!moreThan12InPlacedBelowHorizontalReinforcement) moreThan12InPlacedBelowHorizontalReinforcement = false;
      let rebar_no_ = parseInt(rebarNo);
      // From table 25.4.2.5
      let psi_g = (this.fy <= 60000) ? 1.0 : (this.fy == 80000) ? 1.15 : 1.3;
      psi_g = (this.fy == 100000) ? 1.3 : psi_g;
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
      let ld = Math.ceil(ld_coeff*this.getdb(rebarNo));
      let coefficient_othercase = (rebar_no_ <= 6 ) ? (3/50) : (3/40);
      let coefficient_othercase_mathjax = (rebar_no_ <= 6 ) ? `\\frac{50}{3}` : `\\frac{40}{3}`;
      let ld_coeff_othercase = (coefficient_othercase*psi_t_psi_e*psi_g*this.fy)/(this.lambda*Math.pow(this.fc,0.5));
      // round ld_coeff to nearest whole number
      ld_coeff_othercase = Math.ceil(ld_coeff_othercase);

      // Calculate ld
      let ld_othercase = Math.ceil(ld_coeff_othercase*this.getdb(rebarNo));

      if (this.condition == 'other_cases') {
        return ld_othercase;
      } else {
        return ld;
      }

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
      ldh = Math.ceil(Math.max(8*this.getdb(rebarNo), 6, ldh));

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

      let ldc = Math.ceil(Math.max(ldc_1, ldc_2, 8));

      return ldc;
    }
    calculateLapSpliceInTension (rebarNo, ld) {
      let rebar_no_ = parseInt(rebarNo);
      if (rebar_no_ > 11) return null;
      // Table 25.5.2.1
      let lst_A = Math.ceil(Math.max(12,1*ld));
      let lst_B = Math.ceil(Math.max(12,1.3*ld));
     
      return {"A": lst_A, "B": lst_B};

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
      
      lsc = Math.ceil(lsc)
      

      if (fc < 3000) {
        lsc = Math.ceil(lsc*(4/3));
      } 

      return lsc;
    }
    calculateSeismicDevelopmentLengthOfHookInTension (rebarNo) {
      
      let rebar_no_ = parseInt(rebarNo);

      // From Table 18.8.5.1
      if (rebar_no_ > 11) return null;

      let db = this.getdb(rebarNo);

      let ldh_coeff = (this.fy)/(65*this.lambda*Math.pow(this.fc,0.5));
      ldh_coeff = Math.ceil(ldh_coeff);
      let ldh = Math.ceil(ldh_coeff*db);

      ldh = Math.max(8*db, 6, ldh);

      return (ldh);
    }
    calculateSeismicDevelopmentLengthOfStraightBarInTension (rebarNo, topOrBottom, ldhSeismic, epoxyModFactor) {
      
      let rebar_no_ = parseInt(rebarNo);

      // From Table 18.8.5.1
      if (rebar_no_ > 11) return null;
      let F = (topOrBottom == 'top') ? 3.25 : 2.5;
      let ld = Math.ceil(ldhSeismic*F*epoxyModFactor);

      return ld;
    }
    generateSummaryTableData(epoxyModFactor, confiningReinfModFactor, locationModFactor) {
      
      let rebars = this.rebars;
      epoxyModFactor = parseFloat(epoxyModFactor);
      this.generateDetailedReport = false;
      this.generateCalcReport = false;

      let rebar_data = [];
      let rebar_output = {};

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
        this_data.ld_top = ld_top;
        this_data.ld_bottom = ld_bottom;

        // ld hook
        this_data.ldh = this.calculateDevelopmentLengthOfHooksInTension (rebarNo, epoxyModFactor, confiningReinfModFactor, locationModFactor);
        // ld compression
        this_data.ldc = this.calculateDevelopmentLengthInCompression (rebarNo, confiningReinfModFactor);
  
        let lst_obj = this.calculateLapSpliceInTension(rebarNo, ld_bottom);

        this_data.lst = lst_obj;
        
        let lsc;
        if (lst_obj) {
          lsc = this.calculateLapSpliceInCompression(rebarNo, lst_obj.A);
          this_data.lsc = lsc;
        }

        let hook_bend_90 = this.getMinStandardHookInTension(rebarNo, '90');
        let hook_bend_180 = this.getMinStandardHookInTension(rebarNo, '180');
        this_data.bend_geometry_tension = {
          '90': hook_bend_90,
          '180': hook_bend_180
        };

        let this_rebar_data = this.min_rebar_hook_stirrups[rebarNo];

        if (this_rebar_data) {
          this_data.stirrup_geometry = {
            '90': this.getMinStandardHookForStirrups(rebarNo, '90'),
            '135': this.getMinStandardHookForStirrups(rebarNo, '135'),
            '180': this.getMinStandardHookForStirrups(rebarNo, '180')
          };
        }

        rebar_data.push(this_data);
        rebar_output[rebarNo] = this_data;
      }

      this.rebar_output = rebar_output;
      return rebar_data;
    }
    getRebarDetail(rebarNo) {
      return this.rebar_data[rebarNo];
    }
    getOutput() {
      return this.rebar_output;
    }
}

let lambda = 1.0
let psi_e = 1.0
let psi_r = 1.0
let psi_o = 1.0


let comparison_result_ld = []
let comparison_result_ldh = []
let comparison_result_ldc = []

let verified_data = [
    {
      "rebar": "#6",
      "fy": 40000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 19.5,
      "ld_top_darwin": 24.75,
      "ldc_darwin": 10,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#6",
      "fy": 60000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 28.5,
      "ld_top_darwin": 37.5,
      "ldc_darwin": 15,
      "ld_bottom_aci": 28.5,
      "ldh_aci": 9.7
    },
    {
      "rebar": "#6",
      "fy": 80000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 44.25,
      "ld_top_darwin": 57,
      "ldc_darwin": 19,
      "ld_bottom_aci": 43.5,
      "ldh_aci": 12.9
    },
    {
      "rebar": "#6",
      "fy": 100000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 62.25,
      "ld_top_darwin": 80.25,
      "ldc_darwin": "",
      "ld_bottom_aci": 61.5,
      "ldh_aci": 16.2
    },
    {
      "rebar": "#6",
      "fy": 40000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 28.5,
      "ld_top_darwin": 37.5,
      "ldc_darwin": 10,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#6",
      "fy": 60000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 42.75,
      "ld_top_darwin": 55.5,
      "ldc_darwin": 15,
      "ld_bottom_aci": 42.75,
      "ldh_aci": 9.7
    },
    {
      "rebar": "#6",
      "fy": 80000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 66,
      "ld_top_darwin": 85.5,
      "ldc_darwin": 19,
      "ld_bottom_aci": 65.25,
      "ldh_aci": 12.9
    },
    {
      "rebar": "#6",
      "fy": 100000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 93,
      "ld_top_darwin": 120.75,
      "ldc_darwin": "",
      "ld_bottom_aci": 92.25,
      "ldh_aci": 16.2
    },
    {
      "rebar": "#6",
      "fy": 40000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 17.25,
      "ld_top_darwin": 22.5,
      "ldc_darwin": 9,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#6",
      "fy": 60000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 25.5,
      "ld_top_darwin": 33.75,
      "ldc_darwin": 14,
      "ld_bottom_aci": 25.5,
      "ldh_aci": 9.4
    },
    {
      "rebar": "#6",
      "fy": 80000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 39.75,
      "ld_top_darwin": 51,
      "ldc_darwin": 18,
      "ld_bottom_aci": 39,
      "ldh_aci": 11.6
    },
    {
      "rebar": "#6",
      "fy": 100000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 55.5,
      "ld_top_darwin": 72,
      "ldc_darwin": "",
      "ld_bottom_aci": 55.5,
      "ldh_aci": 15.6
    },
    {
      "rebar": "#6",
      "fy": 40000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 25.5,
      "ld_top_darwin": 33.75,
      "ldc_darwin": 9,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#6",
      "fy": 60000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 38.25,
      "ld_top_darwin": 50.25,
      "ldc_darwin": 14,
      "ld_bottom_aci": 38.25,
      "ldh_aci": 9.4
    },
    {
      "rebar": "#6",
      "fy": 80000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 59.25,
      "ld_top_darwin": 76.5,
      "ldc_darwin": 18,
      "ld_bottom_aci": 58.5,
      "ldh_aci": 11.6
    },
    {
      "rebar": "#6",
      "fy": 100000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 83.25,
      "ld_top_darwin": 108,
      "ldc_darwin": "",
      "ld_bottom_aci": 82.5,
      "ldh_aci": 15.6
    },
    {
      "rebar": "#6",
      "fy": 40000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 15.75,
      "ld_top_darwin": 20.25,
      "ldc_darwin": 9,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#6",
      "fy": 60000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 23.25,
      "ld_top_darwin": 30.75,
      "ldc_darwin": 14,
      "ld_bottom_aci": 23.25,
      "ldh_aci": 9.1
    },
    {
      "rebar": "#6",
      "fy": 80000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 36,
      "ld_top_darwin": 46.5,
      "ldc_darwin": 18,
      "ld_bottom_aci": 36,
      "ldh_aci": 12.2
    },
    {
      "rebar": "#6",
      "fy": 100000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 51,
      "ld_top_darwin": 66,
      "ldc_darwin": "",
      "ld_bottom_aci": 50.25,
      "ldh_aci": 15.2
    },
    {
      "rebar": "#6",
      "fy": 40000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 23.25,
      "ld_top_darwin": 30.75,
      "ldc_darwin": 9,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#6",
      "fy": 60000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 35.25,
      "ld_top_darwin": 45.75,
      "ldc_darwin": 14,
      "ld_bottom_aci": 34.5,
      "ldh_aci": 9.1
    },
    {
      "rebar": "#6",
      "fy": 80000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 54,
      "ld_top_darwin": 69.75,
      "ldc_darwin": 18,
      "ld_bottom_aci": 53.25,
      "ldh_aci": 12.2
    },
    {
      "rebar": "#6",
      "fy": 100000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 75.75,
      "ld_top_darwin": 98.25,
      "ldc_darwin": "",
      "ld_bottom_aci": 75.75,
      "ldh_aci": 15.2
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 32,
      "ld_top_darwin": 42,
      "ldc_darwin": 13,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 48,
      "ld_top_darwin": 62,
      "ldc_darwin": 19,
      "ld_bottom_aci": 47,
      "ldh_aci": 14.9
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 73,
      "ld_top_darwin": 95,
      "ldc_darwin": 26,
      "ld_bottom_aci": 73,
      "ldh_aci": 19.9
    },
    {
      "rebar": "#8",
      "fy": 100000,
      "fc": 4000,
      "condition": "case_a",
      "ld_bottom_darwin": 103,
      "ld_top_darwin": 134,
      "ldc_darwin": "",
      "ld_bottom_aci": 103,
      "ldh_aci": 24.9
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 48,
      "ld_top_darwin": 62,
      "ldc_darwin": 13,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 72,
      "ld_top_darwin": 93,
      "ldc_darwin": 19,
      "ld_bottom_aci": 71,
      "ldh_aci": 14.9
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 110,
      "ld_top_darwin": 142,
      "ldc_darwin": 26,
      "ld_bottom_aci": 109,
      "ldh_aci": 19.9
    },
    {
      "rebar": "#8",
      "fy": 100000,
      "fc": 4000,
      "condition": "other_cases",
      "ld_bottom_darwin": 155,
      "ld_top_darwin": 201,
      "ldc_darwin": "",
      "ld_bottom_aci": 154,
      "ldh_aci": 24.9
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 29,
      "ld_top_darwin": 37,
      "ldc_darwin": 12,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 43,
      "ld_top_darwin": 56,
      "ldc_darwin": 18,
      "ld_bottom_aci": 42,
      "ldh_aci": 14.4
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 66,
      "ld_top_darwin": 85,
      "ldc_darwin": 24,
      "ld_bottom_aci": 65,
      "ldh_aci": 17.8
    },
    {
      "rebar": "#8",
      "fy": 100000,
      "fc": 5000,
      "condition": "case_a",
      "ld_bottom_darwin": 92,
      "ld_top_darwin": 120,
      "ldc_darwin": "",
      "ld_bottom_aci": 92,
      "ldh_aci": 24
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 43,
      "ld_top_darwin": 56,
      "ldc_darwin": 12,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 64,
      "ld_top_darwin": 83,
      "ldc_darwin": 18,
      "ld_bottom_aci": 64,
      "ldh_aci": 14.4
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 98,
      "ld_top_darwin": 127,
      "ldc_darwin": 24,
      "ld_bottom_aci": 98,
      "ldh_aci": 17.8
    },
    {
      "rebar": "#8",
      "fy": 100000,
      "fc": 5000,
      "condition": "other_cases",
      "ld_bottom_darwin": 138,
      "ld_top_darwin": 180,
      "ldc_darwin": "",
      "ld_bottom_aci": 138,
      "ldh_aci": 24
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 26,
      "ld_top_darwin": 34,
      "ldc_darwin": 12,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 39,
      "ld_top_darwin": 51,
      "ldc_darwin": 18,
      "ld_bottom_aci": 39,
      "ldh_aci": 14.1
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 60,
      "ld_top_darwin": 78,
      "ldc_darwin": 24,
      "ld_bottom_aci": 59,
      "ldh_aci": 18.8
    },
    {
      "rebar": "#8",
      "fy": 100000,
      "fc": 6000,
      "condition": "case_a",
      "ld_bottom_darwin": 84,
      "ld_top_darwin": 110,
      "ldc_darwin": "",
      "ld_bottom_aci": 84,
      "ldh_aci": 23.5
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 39,
      "ld_top_darwin": 51,
      "ldc_darwin": 12,
      "ld_bottom_aci": "",
      "ldh_aci": ""
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 59,
      "ld_top_darwin": 76,
      "ldc_darwin": 18,
      "ld_bottom_aci": 58,
      "ldh_aci": 14.1
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 90,
      "ld_top_darwin": 116,
      "ldc_darwin": 24,
      "ld_bottom_aci": 89,
      "ldh_aci": 18.8
    },
    {
      "rebar": "#8",
      "fy": 100000,
      "fc": 6000,
      "condition": "other_cases",
      "ld_bottom_darwin": 126,
      "ld_top_darwin": 164,
      "ldc_darwin": "",
      "ld_bottom_aci": 126,
      "ldh_aci": 23.5
    }
]

verified_data.map(obj => {
    let res_obj_ld = {}
    let res_obj_ldc = {}
    let res_obj_ldh = {}

    let {rebar, fy, fc, condition, ld_bottom_darwin, ld_bottom_aci, ld_top_darwin, ldc_darwin, ldh_aci} = obj

    let this_rebar = new RebarDetails(fy, fc, lambda, condition);
    let this_rebar_detail = this_rebar.generateCalcs(rebar, psi_e, false, psi_r, psi_o, false);
    let {ldh, ld_top, ld_bottom, ldc} = this_rebar_detail

    let dif_bottom_darwin = Math.round( (ld_bottom_darwin - ld_bottom)*100)/100
    let dif_bottom_aci = (ld_bottom_aci) ? Math.round( (ld_bottom_aci - ld_bottom)*100)/100 : ''

    let dif_top = ld_top_darwin- ld_top
     
    res_obj_ld = {
        rebar, fy, fc, condition, ld_bottom_darwin, ld_bottom_aci, ld_bottom, dif_bottom_darwin, dif_bottom_aci, ld_top_darwin, ld_top, dif_top
    }
    
    let dif_ldh =  (ldh_aci != '') ? Math.round((ldh-ldh_aci)*100)/100 : ''
    let dif_ldc =  (ldc_darwin != '') ? Math.round((ldc-ldc_darwin)*100)/100 : ''

    res_obj_ldh = {
        rebar, fy, fc, condition, ldh_aci, ldh, dif: dif_ldh
    }

    res_obj_ldc = {
        rebar, fy, fc, condition, ldc_darwin, ldc, dif: dif_ldc
    }

    comparison_result_ld.push(res_obj_ld)
    comparison_result_ldh.push(res_obj_ldh)
    comparison_result_ldc.push(res_obj_ldc)

})


console.log('Comparing ld')
console.table(comparison_result_ld)

// console.log(JSON.stringify(comparison_result_ld))

console.log('Comparing ldh')
console.table(comparison_result_ldh)
// console.log(JSON.stringify(comparison_result_ldh))

console.log('Comparing ldc')
console.table(comparison_result_ldc)
// console.log(JSON.stringify(comparison_result_ldc))

  