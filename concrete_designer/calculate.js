module.exports = function (input_json) {

    let {beam_mark, fy, fc, fyt, b, h, db ,ds, C_c} = input_json;

    // Loads
    let {Mu_topA, Mu_botA, Mu_topB, Mu_botB, Mu_top_mid, Mu_bot_mid, Vu_location, Vu} = input_json;

    var prettyPrint = function (val, decimal) {
      if (typeof val == "undefined" || val == null) return "-";
      val = parseFloat(val);
      if (!decimal) decimal = 3;
      var res = ReportHelpers.round(val, decimal);
      if (isNaN(res)) return val;
      return res;
    };

    function interpolate([[x1,y1], x2, [x3,y3]]) {
        return (((x2 - x1) * (y3 - y1)) / (x3 - x1)) + y1;    
    }

    function topBottomSearch(number, object) {

        var list = [];
        for (var n in object) {
            // dump the key values into a list
            list.push(parseFloat(n));
        }
        // Sort the list in ascending order
        list.sort(function (a, b) {
            return a - b;
        });
        
        for (var i = 0; i < list.length; i++) {
            // loop until number is found
            var current_num = list[i];
            if (current_num < number) {
                before_num = current_num;
            } else if (current_num > number) {
                after_num = current_num;
                break;
            }
        }
        
        return {
            "after": after_num,
            "before": before_num
        };
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
                "14": {"db": 1.693,"As": 2.25, "unit": "in"},
                "18": {"db": 2.257,"As": 4.00, "unit": "in"},

                "#3": {"db": 0.375,"As": 0.11, "unit": "in"},
                "#4": {"db": 0.5,"As": 0.20, "unit": "in"},
                "#5": {"db": 0.625,"As": 0.31, "unit": "in"},
                "#6": {"db": 0.75,"As": 0.44, "unit": "in"},
                "#7": {"db": 0.875,"As": 0.6, "unit": "in"},
                "#8": {"db": 1,"As": 0.79, "unit": "in"},
                "#9": {"db": 1.128,"As": 1, "unit": "in"},
                "#10": {"db": 1.27,"As": 1.27, "unit": "in"},
                "#11": {"db": 1.41,"As": 1.56, "unit": "in"},
                "#14": {"db": 1.693,"As": 2.25, "unit": "in"},
                "#18": {"db": 2.257,"As": 4.00, "unit": "in"},
            };

            this.db = rebars[rebarNo].db;
            this.As = rebars[rebarNo].As;
        }
    }

    class Concrete {
        constructor(fc) {
            this.fc = fc;
            this.beta1 = (fc >= 2500 && fc <= 4000) ? 0.85 : (fc >= 8000) ? 0.65 : interpolate([[4000,0.85],fc, [8000,0.65]]);
        }
    }

    class Beam {
        constructor (beamWidth, beamDepth, concreteStrengthfc, mainReinfYieldfy,  transverseReinfYieldfyt, mainReinfDiaRebarNo, transvereReinfDiaRebarNo, concreteCoverCc, generateDetailedReport) {
            this.b =  beamWidth;
            this.h =  beamDepth;

            let concrete = new Concrete(concreteStrengthfc);
            this.fc =  concrete.fc;
            this.beta1 = concrete.beta1;

            this.fy =  mainReinfYieldfy;
            this.fyt =  transverseReinfYieldfyt;
 
            let main_reinforcement = new Rebar(mainReinfDiaRebarNo);
            let transverse_reinforcement = new Rebar(transvereReinfDiaRebarNo);
            this.db =  main_reinforcement.db;
            this.ds =  transverse_reinforcement.db;

            this.mainBarNo = mainReinfDiaRebarNo;
            this.shearBarNo = mainReinfDiaRebarNo;

            this.Ab = main_reinforcement.As;

            this.cc = concreteCoverCc;
            this.d_prime = this.cc + this.ds + this.db*0.5;
            this.d = this.h - this.d_prime;

            this.rho_min = (this.fy == 40000) ? 0.005 : 0.0033;

            this.ety = (this.fy/1000)/29000;
            this.ety_min = 0.003+this.ety;
            this.rho_max = 0.85*(this.beta1)*(this.fc/this.fy)*(0.003/(0.003+this.ety_min));
            this.rho_balanced = 0.85*(this.beta1)*(this.fc/this.fy)*(0.003/(0.003+this.ety));
            this.rho_min = Math.max((3*Math.pow(this.fc,0.5))/this.fy, 200/this.fy);

            this.Av = 2*transverse_reinforcement.As;

            this.generateDetailedReport = (typeof generateDetailedReport == 'undefined') ? false : generateDetailedReport;

            if (this.generateDetailedReport) {
                let table_data = [
                    ["Parameter", "Value"],
                    ["[mathin] d' [mathin]", `${this.d_prime} in.`],
                    ["[mathin] d [mathin]", `${this.d} in.`],
                    ["[mathin] \\phi{flexure} [mathin]", 0.9],
                    ["[mathin] \\phi{shear} [mathin]", 0.75],
                    ["[mathin] \\beta_{1} [mathin]", prettyPrint(this.beta1,3)],
                    ["[mathin] \\epsilon_{ty} [mathin]", `${prettyPrint(this.ety,4)}`],
                    ["[mathin] \\epsilon_{ty,min} [mathin]", `${prettyPrint(this.ety_min, 4)}`],
                    ["[mathin] \\rho_{min} [mathin]", `${prettyPrint(this.rho_min, 4)}`],
                    ["[mathin] \\rho_{max} [mathin]", `${prettyPrint(this.rho_max, 4)}`],
                    ["[mathin] \\rho_{b} [mathin]", `${prettyPrint(this.rho_balanced, 4)}`],
                    ["[mathin] A_{v} [mathin]", `${prettyPrint(this.Av, 4)} sq.in.`],
                ];
                
                let options = {
                    heading: "Additional Parameters",
                    text_aligns: "center", //or just "center"
                    reference: ""
                };

                ReportHelpers.quickTable(table_data, options);
                
            }
        }
        calculateFlexureReinforcement(designMomentMu, location) {
            // designMomentMu in kip-ft 
            designMomentMu = Math.abs(designMomentMu*12*1000); // convert to lb-in
            let As = this.calculateAreaOfReinforcementAs(designMomentMu);
            let no_of_rebar_required = Math.ceil(As/this.Ab);
            no_of_rebar_required = Math.max(2, no_of_rebar_required);

            if (this.generateDetailedReport) {
                REPORT.block.addCalculation(`For ${location}:`);
                ReportHelpers.lineResult("Design Moment", "M_{u}", `${prettyPrint(designMomentMu/(12*1000),2)} kip-ft`);
                ReportHelpers.lineResult("Flexure reinforcement", "A_{s}", `${prettyPrint(As,3)} sq.in.`);
                ReportHelpers.lineResult(`Required no. of ${this.mainBarNo} rebars`, "n_{db}", no_of_rebar_required);
            }
            return no_of_rebar_required;        }
        calculateShearCapacityOfConcreteVc() {
            let Vc = 2*this.b*this.d*Math.pow(this.fc,0.5);
            if (this.generateDetailedReport) ReportHelpers.lineResult("Shear capacity of concrete section (ACI 318-19 22.5.5.1) ", "V_{c}", prettyPrint(Vc, 2) +' lbs');
            return Vc; //in lb
        }
        calculateShearReinforcementSpacing(Vu) {
            // Vu in kips
            Vu = Math.abs(Vu*1000);
            let this_Vc = this.Vc;
            let phi_shear = 0.75;

            let s;
            if (Vu < phi_shear*this_Vc*0.5) {
                s = 0;

                s = Math.min(this.d/2, 24);
                if (this.generateDetailedReport) {  
                    ReportHelpers.lineResult("Shear reinforcement not required.", "s", prettyPrint(s, 2) +' in.');
                }
            } else if (Vu >= phi_shear*this_Vc*0.5 && Vu < phi_shear*this_Vc) {
                s = Math.min((this.Av*this.fyt)/(phi_shear*Math.pow(fc,0.5)*this.b), (this.Av*this.fyt)/(50*this.b));
                s = Math.min(this.d/2, 8, s);
                if (this.generateDetailedReport) ReportHelpers.lineResult("Minimum reinforcement spacing required", "s", prettyPrint(s, 2) +' in.');
            } else {
                let Vs = (Vu/phi_shear) - this_Vc;
                s = (this.Av*this.fyt*this.d)/Vs;
                if (this.generateDetailedReport) {
                    ReportHelpers.lineResult("Shear strength provided by stirrups", "V_{s}", prettyPrint(Vs, 2) +' lbs');
                    ReportHelpers.lineResult("Spacing required", "s", prettyPrint(s, 2) +' in.');
                } 

                let s_max;
                if (Vs <= 4*this.b*this.d*Math.pow(this.fc,0.5)) {
                    s_max = Math.min(this.d/2, 24);
                } else {
                    s_max = Math.min(this.d/4, 12);
                }

                s = Math.min(s, s_max);
                if (this.generateDetailedReport) {
                    ReportHelpers.lineResult("Max. limit of spacing", "s_{max}", prettyPrint(s_max, 2) +' in.');
                    ReportHelpers.lineResult("Final spacing", "s", prettyPrint(s, 2) +' in.');
                } 
   
            }
        
            return s;
        }
        calculateShearCapacity(spacing) {
            let phi_shear = 0.75;
            let this_Vc = this.calculateShearCapacityOfConcreteVc();
            let Vs = (this.Av*this.fyt*this.d)/spacing;
            let phiVn = phi_shear*(this_Vc+Vs);
            return phiVn;
        }
        calculateMomentCapacityFromRebars(rebarNo, numberOfRebar) {
            let this_rebar = new Rebar(rebarNo);
            let As = this_rebar.As*numberOfRebar;
            let a = (As*this.fy)/(0.85*this.fc*this.b);
            let Mn = As*this.fy*(this.d - a*0.5);
            let phiMn = Mn*this.phi_flexure;
            return phiMn;
        }
        calculateAreaOfReinforcementAs(Mu) {
            let a = 20;
            let phi_flexure = 0.9;
            let As;

            // iterate until convergence of a is achieved
            for (let i = 0; i < 20; i ++) {
                As = (Mu)/(phi_flexure*this.fy*(this.d - a*0.5));
                // check val of a
                a = (As*this.fy)/(0.85*this.fc*this.b);
            }
    
            return As;
        }
        generateFlexureReinforcements (momentAEndObj, momentMidObj, momentBendObj) {
            REPORT.block.addCalculation(`Calculating for the required no. of main reinforcement, the following assumptions were used:
            <ul>
                <li>The RC beam is analyzed as a rectangular section;</li>
                <li>The required [mathin] A_{s} [mathin] will be calculated with the assumption of 1 layer of rebars;</li>
                <li>Compression reinforcement are neglected in the calculation;</li>
                <li>A minimum of 2 rebars shall be provided;</li>
            </ul>
            Iterating values of [mathin] a [mathin] and solving for [mathin] A_{s} [mathin], then using the new value of [mathin] a [mathin] until it converges (20 iterations used). Initial value of [mathin] a = 50 [mathin]:
            [math] As = \\frac{M_{u}}{ \\phi f_{y} (d - a/2)} [math]
            [math] a_{new} = \\frac{A_{s} f_{y}}{ 0.85 f'_{c} b } [math]
            `);

            let momentObj = {
                "A_end": momentAEndObj,
                "B_end": momentBendObj,
                "mid": momentMidObj
            };

            let result = {
                "A_end": {
                    "top": this.calculateFlexureReinforcement(momentObj['A_end'].top, 'A-end Top'),
                    "bottom": this.calculateFlexureReinforcement(momentObj['A_end'].bottom, 'A-end Top'),
                },
                "B_end": {
                    "top": this.calculateFlexureReinforcement(momentObj['B_end'].top, 'B-end Top'), 
                    "bottom": this.calculateFlexureReinforcement(momentObj['B_end'].bottom, 'B-end Top')
                },
                "mid": {
                    "top": this.calculateFlexureReinforcement(momentObj['mid'].top, 'Midspan Top'), 
                    "bottom": this.calculateFlexureReinforcement(momentObj['mid'].bottom, 'Midspan Top')
                }
            };

            for (let loc in result) {
                let this_loc = result[loc];
                let capacity_top = this.calculateMomentCapacityFromRebars(this.mainBarNo, this_loc.top)
                let capacity_bottom= this.calculateMomentCapacityFromRebars(this.mainBarNo, this_loc.bottom)
                let UR_top = momentObj[loc].top/capacity_top
                let UR_bottom = momentObj[loc].bottom/capacity_bottom

                result[loc].capacity_top = capacity_top
                result[loc].capacity_bottom = capacity_bottom
                result[loc].UR_top = UR_top
                result[loc].UR_bottom = UR_bottom
            }
                
            return result;
        }
        generateShearReinforcementSpacing(shearAbsForcesArr) {
            // [location, Vu]

            REPORT.block.addCalculation(`Calculating for the required spacing of shear reniforcement, the following assumptions were used:
            <ul>
                <li>The spacing of stirrups was calculated using two (2) legs</li>
                <li>The maximum spacing, regardless if stirrups are required or not, will be minimum of [mathin]d/2[mathin] or 24 in.</li>
                <li>Torsional effects not considered. </li>
            </ul>
            `);

            this.Vc = this.calculateShearCapacityOfConcreteVc();

            let result = shearAbsForcesArr.map(arr => {
                let Vu = arr[1];
                let location = arr[0];
                let spacing_ = this.calculateShearReinforcementSpacing(Vu);
                return spacing_;
            });

            return result;
        }
    }



    
    // Reusable function for generating table
    function generateResultsTable (header, data, options) {
      let table_data = [...header, ...data];
      options.text_aligns = "center";
      ReportHelpers.quickTable(table_data, options);
    }
  
    // TITLE
    REPORT.block.new("Design of Singly Reinforced Concrete Beam<br><br>(ACI 318-19)", 2);
    REPORT.block.finish();
  
    var beam1 = new Beam(b,h,fc,fy,fyt,db,ds,C_c, true);
    REPORT.block.new(`Flexure Reinforcements:`, 2);
    let reinforcements = beam1.generateFlexureReinforcements(
        {top: Mu_topA, bottom: Mu_botA}, 
        {top: Mu_top_mid, bottom: Mu_bot_mid}, 
        {top: Mu_topB, bottom: Mu_botB} 
    );
    REPORT.block.finish();

    REPORT.block.new(`Shear Reinforcements:`, 2);
    let min_stirrup_spacing_arr = beam1.generateShearReinforcementSpacing([
        [Vu_location, Vu]
    ]);
    REPORT.block.finish();

    REPORT.section.break();  

    var output = {
      results: {
        "beam_mark": {
            "label":"Beam Mark", //you can add this label key if you want to use cleaner keys
            "value": beam_mark,
        },
        "db": {
            "label":"Rebar No.", //you can add this label key if you want to use cleaner keys
            "value": db,
        },
        "topA": {
            "label":`Top Bars (A-end)`,
            "value": parseInt(reinforcements.A_end.top)
        },
        "botA": {
            "label":`Bottom Bars (A-end)`,
            "value": parseInt(reinforcements.A_end.bottom)
        },
        "top_mid_end": {
            "label":`Top Bars (Midspan)`,
            "value":parseInt(reinforcements.mid.top)
        },
        "bot_mid_end": {
            "label":`Bottom Bars (Midspan)`,
            "value": parseInt(reinforcements.mid.bottom)
        },
        "topB": {
            "label":`Top Bars (B-end)`,
            "value": parseInt(reinforcements.B_end.top)
        },
        "botB": {
            "label":`Bottom Bars (B-end)`,
            "value": parseInt(reinforcements.B_end.bottom)
        },
        "stirrups_spacing": {
            "label":`Min. Stirrups Spacing, in.`,
            "value": prettyPrint(min_stirrup_spacing_arr[0],2),
            "units": "in"
        },
      },
      report: REPORT,
    };

    return output;


  };
  