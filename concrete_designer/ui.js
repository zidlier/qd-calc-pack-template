let input = SKYCIV_DESIGN.designConfig.getInput();

var shear_forces_table = null;

// "shearForcesAdd": {
// 	"type": "div",
// 	"id": "shear-forces-add"
// },
// "shearForces": {
// 	"type": "div",
// 	"id": "shear-forces"
// }

// jQuery(document).ready(function () {

//     jQuery('#shear-forces-add').html(`<button id="shear-forces-entry-table-add" class="ui button icon mini teal"><i class="add icon"></i>Add Forces</button>`);

//     shear_forces_table = new ENTRY_TABLE({
//         'selector': '#shear-forces',
//         'onDelete': function (row_index) {
//             console.log('Delete Row ' + row_index)
//         },
//         'columns': [
//             {
//                 "id": "location",
//                 "title": 'Location',
//                 "tooltip": "Location from support, in ft.",
//                 "default_value": 0,
//                 "minimum": 0,
//                 "exclusive_minimum": true,
//                 "type": "number",
//                 "cell_type": "input_text",
//                 "cell_width": "auto",
//                 "disabled": false,
//                 "nullable": false,
//                 "change": function (value, row_index, col_index) {
//                     console.log('Value of ' + value + ' at Cell ' + row_index + ',' + col_index)
//                 },
//             },
//             {
//                 "id": "Vy",
//                 "title": 'V<sub>y</sub>, kips',
//                 "tooltip": "Shear Force, kips",
//                 "default_value": 100,
//                 "minimum": 0,
//                 "exclusive_minimum": true,
//                 "type": "number",
//                 "cell_type": "input_text",
//                 "cell_width": "auto",
//                 "disabled": false,
//                 "nullable": false,
//                 "change": function (value, row_index, col_index) {
//                     console.log('Value of ' + value + ' at Cell ' + row_index + ',' + col_index)
//                 },
//             },
//             {
//                 "title": "Delete",
//                 "id": "delete",
//                 "tooltip": "",
//                 "default_value": '<div class="row-delete-btn"><i class="icon large red delete link"></i></div>',
//                 "cell_type": "text",
//                 "cell_width": 70,
//                 "disabled": false,
//             }
//         ]
//     });

//     setTimeout(function () {
//         jQuery("#shear-forces-entry-table-add").click(function () {
//             // Get ID of the last row
//             let $table = shear_forces_table.table;
//             let col_index = shear_forces_table.getColumnIndexFromKey("location");
// 			let last_row_id = parseInt($table.find('tbody tr').last().find('td').eq(col_index).find('input').val());
// 			if (isNaN(last_row_id)) last_row_id = 0;
// 			let $new_row = shear_forces_table.addEmptyRow();
//         })
//     }, 200);

// })



