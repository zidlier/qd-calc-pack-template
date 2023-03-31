const fs = require('fs')

let expected_return = {
    "ld_bottom": {
      "value": 18,
      "units": "in"
    },
    "ld_top": {
      "value": 23,
      "units": "in"
    },
    "ldc": {
      "value": 9,
      "units": "in"
    },
    "lsc": {
        "value": 9,
        "units": "in"
    },
    "lst_A": {
        "value": 9,
        "units": "in"
    },
    "lst_B": {
        "value": 9,
        "units": "in"
    }
}

var test_files = [
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 4000,
      "condition": "case_a",
      "ldc": 13,
      "ld_bottom": 32,
      "ld_top": 42,
      "lsc": 20,
      "lst_A": 32,
      "lst_B": 42
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 4000,
      "condition": "case_a",
      "ldc": 19,
      "ld_bottom": 48,
      "ld_top": 62,
      "lsc": 30,
      "lst_A": 48,
      "lst_B": 63
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 4000,
      "condition": "case_a",
      "ldc": 26,
      "ld_bottom": 73,
      "ld_top": 95,
      "lsc": 48,
      "lst_A": 73,
      "lst_B": 95
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 4000,
      "condition": "other_cases",
      "ldc": 13,
      "ld_bottom": 48,
      "ld_top": 62,
      "lsc": 20,
      "lst_A": 48,
      "lst_B": 63
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 4000,
      "condition": "other_cases",
      "ldc": 19,
      "ld_bottom": 72,
      "ld_top": 93,
      "lsc": 30,
      "lst_A": 72,
      "lst_B": 94
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 4000,
      "condition": "other_cases",
      "ldc": 26,
      "ld_bottom": 110,
      "ld_top": 142,
      "lsc": 48,
      "lst_A": 110,
      "lst_B": 143
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 5000,
      "condition": "case_a",
      "ldc": 12,
      "ld_bottom": 29,
      "ld_top": 37,
      "lsc": 20,
      "lst_A": 29,
      "lst_B": 38
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 5000,
      "condition": "case_a",
      "ldc": 18,
      "ld_bottom": 43,
      "ld_top": 56,
      "lsc": 30,
      "lst_A": 43,
      "lst_B": 56
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 5000,
      "condition": "case_a",
      "ldc": 24,
      "ld_bottom": 66,
      "ld_top": 85,
      "lsc": 48,
      "lst_A": 66,
      "lst_B": 86
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 5000,
      "condition": "other_cases",
      "ldc": 12,
      "ld_bottom": 43,
      "ld_top": 56,
      "lsc": 20,
      "lst_A": 43,
      "lst_B": 56
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 5000,
      "condition": "other_cases",
      "ldc": 18,
      "ld_bottom": 64,
      "ld_top": 83,
      "lsc": 30,
      "lst_A": 64,
      "lst_B": 84
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 5000,
      "condition": "other_cases",
      "ldc": 24,
      "ld_bottom": 98,
      "ld_top": 127,
      "lsc": 48,
      "lst_A": 98,
      "lst_B": 128
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 6000,
      "condition": "case_a",
      "ldc": 12,
      "ld_bottom": 26,
      "ld_top": 34,
      "lsc": 20,
      "lst_A": 26,
      "lst_B": 34
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 6000,
      "condition": "case_a",
      "ldc": 18,
      "ld_bottom": 39,
      "ld_top": 51,
      "lsc": 30,
      "lst_A": 39,
      "lst_B": 51
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 6000,
      "condition": "case_a",
      "ldc": 24,
      "ld_bottom": 60,
      "ld_top": 78,
      "lsc": 48,
      "lst_A": 60,
      "lst_B": 78
    },
    {
      "rebar": "#8",
      "fy": 40000,
      "fc": 6000,
      "condition": "other_cases",
      "ldc": 12,
      "ld_bottom": 39,
      "ld_top": 51,
      "lsc": 20,
      "lst_A": 39,
      "lst_B": 51
    },
    {
      "rebar": "#8",
      "fy": 60000,
      "fc": 6000,
      "condition": "other_cases",
      "ldc": 18,
      "ld_bottom": 59,
      "ld_top": 76,
      "lsc": 30,
      "lst_A": 59,
      "lst_B": 77
    },
    {
      "rebar": "#8",
      "fy": 80000,
      "fc": 6000,
      "condition": "other_cases",
      "ldc": 24,
      "ld_bottom": 90,
      "ld_top": 116,
      "lsc": 48,
      "lst_A": 90,
      "lst_B": 117
    }
]


let test_num = 1

test_files.map(obj => {

    let {rebar, fy, fc, condition, ldc, ld_bottom, ld_top, lsc, lst_A, lst_B} = obj

    let this_input = {
        "fy": fy,
        "fc": fc,
        "lambda": "1.0",
        "psi_e": 1,
        "psi_r": 1,
        "psi_o": 1,
        "db": rebar,
        "condition": condition
    }

    let this_expected_return = {
        "ld_bottom": {
          "value": ld_bottom,
          "units": "in"
        },
        "ld_top": {
          "value": ld_top,
          "units": "in"
        },
        "ldc": {
          "value": ldc,
          "units": "in"
        },
        "lsc": {
            "value": lsc,
            "units": "in"
        },
        "lst_A": {
            "value": lst_A,
            "units": "in"
        },
        "lst_B": {
            "value": lst_B,
            "units": "in"
        }
    }
    
    let condition_name = (condition =='other_cases') ? 'caseB' : 'caseA'

    let dirname = `./testfiles/${rebar}_${fc}_${fy}_${condition_name}`
    if (!fs.existsSync(dirname)){
        fs.mkdirSync(dirname);
    }
    
    fs.writeFileSync(`${dirname}/input.json`, JSON.stringify(this_input))
    fs.writeFileSync(`${dirname}/expected_return.json`, JSON.stringify(this_expected_return))

    test_num++
})