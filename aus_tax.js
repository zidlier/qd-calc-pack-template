let incr = 10000
let house_food = (200+80)*4*12
let transpo = 320*12
let phone = 25*12
function calculateTax(grossIncome) {
    let res = {income: grossIncome, tax: 0, percentage: 0}
    if (grossIncome <= 18200) {
        
    } else if (grossIncome > 18200 && grossIncome <= 45000) {
        res.tax = (grossIncome-18200)*0.19
    } else if (grossIncome > 45000 && grossIncome <= 120000) {
        res.tax = (grossIncome-45000)*0.325 + 5092
    } else if (grossIncome > 120000 && grossIncome <= 180000) {
        res.tax =  29467 + (grossIncome-120000)*0.37
    } else if (grossIncome > 180000) {
        res.tax =  51667 + (grossIncome-180000)*0.45
    }

    res.percentage = Math.round((res.tax/grossIncome)*10000)/100
    res.net = grossIncome - res.tax
    res.house_food =house_food
    res.transpo =transpo
    res.phone =phone
    res.final_net = res.net - house_food - transpo -  phone
    res.month_savings = Math.round( 100*res.final_net/12)/100
    return res
}


let taxes = []
for (let i = 4; i <= 30; i++) {
    let this_income = 10000*i
    taxes.push(calculateTax(this_income))
}

console.table(taxes)