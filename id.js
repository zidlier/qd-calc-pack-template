var input_json = {
    "auth": "patrick@skyciv.com",
    "key": "YOUR API TOKEN, get this from https://platform.skyciv.com/api",
    "uid": "draft/uid45dcb4aaf8d9a",
    "input": {
        "fy": "100000",
        "fc": "6000",
        "lambda": "1.0",
        "psi_e": 1,
        "spacing_cover_condition": "case_a",
        "psi_r": 1,
        "psi_o": 1,
        "db": "#6",
        "project_details": {
            "units": {
                "project_units": ""
            },
            "project_company": "",
            "project_name": "",
            "project_designer": "",
            "project_id": "",
            "project_client": "",
            "project_notes": ""
        }
    }
} 
			
				$.ajax({
					url: 'https://dev.skyciv.com:8088/run',
					type: 'POST',
					cache: false,
					data: {
						payload: JSON.stringify(input_json),
					},
					dataType: 'json',
					success: function(res){
						console.log(res)
					}
					, error: function(jqXHR, textStatus, err){
						alert('text status '+textStatus+', err '+err)
					}
				});
			
		