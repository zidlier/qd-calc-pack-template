module.exports = function (input_json) {

    let {beam_mark, fy, fc, fyt, b, h, db ,ds, C_c} = input_json;

    // Loads
    let {Mu_topA, Mu_botA, Mu_topB, Mu_botB, Mu_top_mid, Mu_bot_mid} = input_json;

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
            list.push(parseFloat(n))
        }
        // Sort the list in ascending order
        list.sort(function (a, b) {
            return a - b
        });
        
        for (var i = 0; i < list.length; i++) {
            // loop until number is found
            var current_num = list[i];
            if (current_num < number) {
                before_num = current_num;
            } else if (current_num > number) {
                after_num = current_num;
                break
            }
        }
        
        return {
            "after": after_num,
            "before": before_num
        };
    }

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
            this.As = rebars[rebarNo].As
        }
    }

    class Concrete {
        constructor(fc) {
            this.fc = fc
            this.beta1 = (fc >= 2500 && fc <= 4000) ? 0.85 : (fc >= 8000) ? 0.65 : interpolate([[4000,0.85],fc, [8000,0.65]])
        }
    }

    class Beam {
        constructor (beamWidth, beamDepth, concreteStrengthfc, mainReinfYieldfy,  transverseReinfYieldfyt, mainReinfDiaRebarNo, transvereReinfDiaRebarNo, concreteCoverCc) {
            this.b =  beamWidth;
            this.h =  beamDepth;

            let concrete = new Concrete(concreteStrengthfc)
            this.fc =  concrete.fc;
            this.beta1 = concrete.beta1;

            this.fy =  mainReinfYieldfy;
            this.fyt =  transverseReinfYieldfyt;
 
            let main_reinforcement = new Rebar(mainReinfDiaRebarNo)
            let transverse_reinforcement = new Rebar(transvereReinfDiaRebarNo)
            this.db =  main_reinforcement.db;
            this.ds =  transverse_reinforcement.db;

            this.Ab = main_reinforcement.As

            this.cc = concreteCoverCc;
            this.d_prime = this.cc + this.ds + this.db*0.5;
            this.d = this.h - this.d_prime;

            this.rho_min = (this.fy == 40000) ? 0.005 : 0.0033

            this.ety = this.fy/29000;
            this.ety_min = 0.003+this.ety;
            this.rho_max = 0.85*(this.beta1)*(this.fc/this.fy)*(0.003/(0.003+this.ety_min));
            this.rho_balanced = 0.85*(this.beta1)*(this.fc/this.fy)*(0.003/(0.003+this.ety));
            this.rho_min = Math.max((3*Math.pow(this.fc,0.5))/this.fy, 200/this.fy);

            this.Av = 2*transverse_reinforcement.As
            
        }
        calculateFlexureReinforcement(designMomentMu) {
            // designMomentMu in kip-ft 
            designMomentMu = Math.abs(designMomentMu*12*1000) // convert to lb-in
            let As = calculateAs(designMomentMu, this.fc, this.fy, this.b, this.d );
            let no_of_rebar_required = Math.ceil(As/this.Ab)
            no_of_rebar_required = Math.max(2, no_of_rebar_required)
            return no_of_rebar_required

        }
        calculateShearCapacityOfConcreteVc() {
            let Vc = 2*this.b*this.d*Math.pow(this.fc,0.5);
            return Vc; //in lb
        }
        calculateShearReinforcementSpacing(Vu) {
            // Vu in kips
            Vu = Vu*1000
            let this_Vc = this.calculateShearCapacityOfConcreteVc()
            let phi_shear = 0.75;

            let s
            if (Vu < phi_shear*Vc*0.5) {
                s = 0;
            } else if (Vu >= phi_shear*Vc*0.5 && Vu < phi_shear*Vc) {
                s = Math.min((this.Av*this.fyt)/(phi_shear*Math.pow(fc,0.5)*this.b), (this.Av*this.fyt)/(50*this.b))
            } else {
                let Vs = (Vu/phi_shear) - this_Vc
                s = (this.Av*this.fyt*this.d)/Vs;

                let s_max
                if (Vs <= 4*this.b*this.d*Math.pow(this.fc,0.5)) {
                    s_max = Math.min(this.d/2, 24)
                } else {
                    s_max = Math.min(this.d/4, 12)
                }

                s = Math.min(s, s_max)
                
            }
        
            return s
        }
        calculateShearCapacity(spacing) {
            let phi_shear = 0.75;
            let this_Vc = this.calculateShearCapacityOfConcreteVc()
            let Vs = (this.Av*this.fyt*this.d)/spacing;
            let phiVn = phi_shear*(this_Vc+Vs)
            return phiVn
        }
        calculateMomentCapacityFromRebars(rebarNo, numberOfRebar) {
            let this_rebar = new Rebar(rebarNo)
            this_rebar.As
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
  
    var beam1 = new Beam(b,h,fc,fy,fyt,db,ds,C_c)
    logger(beam1.Ab)

    let Mu_arr = [Mu_topA, Mu_botA, Mu_top_mid, Mu_bot_mid, Mu_topB, Mu_botB ]

    let flexure_reinf = []
    
    Mu_arr.map(mu => {
        flexure_reinf.push(beam1.calculateFlexureReinforcement(mu))
    })

    

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
            "value": parseInt(flexure_reinf[0])
        },
        "botA": {
            "label":`Bottom Bars (A-end)`,
            "value": parseInt(flexure_reinf[1])
        },
        "top_mid_end": {
            "label":`Top Bars (Midspan)`,
            "value": parseInt(flexure_reinf[2])
        },
        "bot_mid_end": {
            "label":`Bottom Bars (Midspan)`,
            "value": parseInt(flexure_reinf[3])
        },
        "topB": {
            "label":`Top Bars (B-end)`,
            "value": parseInt(flexure_reinf[4])
        },
        "botB": {
            "label":`Bottom Bars (B-end)`,
            "value": parseInt(flexure_reinf[5])
        },
      },
      report: REPORT,
    };
  
    return output;

    // id uid8e326f3f13ec8

            
  
  };
  