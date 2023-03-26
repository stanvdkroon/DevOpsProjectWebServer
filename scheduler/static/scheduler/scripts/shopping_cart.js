$(document).ready(function() {

    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = "X-CSRFTOKEN";

    let order = JSON.parse(localStorage.order);

    let requests = [];
    for (const [item_id, value] of Object.entries(order)) {
        requests.push(get_item(item_id))
    }

    axios.all(requests).then((responses) => {
        var items = {};
        responses.forEach(function(response) {
            items[response.data.id] = response.data
        });

        load_tbody(items)
    });

    document.querySelector("#checkout_button").onclick = () => {
        let formData = new FormData();
        formData.append('order', localStorage.order);

        axios({
            method: "post",
            url: "/checkout/",
            data: formData
        }).then((response) => {
            if (response.data.success == true) {
                localStorage.order = JSON.stringify({});
                load_tbody({})
            } else {
                alert("Transaction failed.")
            }
        })
    }
});

function get_item(item_id) {
    const url = "/api/";
    let formData = new FormData();
    formData.append("item_id", item_id);

    return axios({
        method: "post",
        url: url,
        data: formData
    })
}

function load_tbody(items) {
    let $table = $('#modal_table');

    $table.bootstrapTable('resetView');

    const order = JSON.parse(localStorage.order);

    let tdata = [];
    let total_price = 0.0;

    for (const [item_id, value] of Object.entries(order)) {

        for (const [size, qty] of Object.entries(value)) {

            if (qty > 0) {

                let price = (parseInt(qty) * parseFloat(items[item_id]["price_" + size])).toFixed(2);
                total_price += parseFloat(price);

                let tdata_point = {
                    'category': items[item_id].category,
                    'name': items[item_id].name,
                    'size': size,
                    'quantity': qty,
                    'total': "$" + price
                };

                tdata.push(tdata_point)
            }
        }
    }

    $table.bootstrapTable('load', tdata);
    document.querySelector("#total_price").innerHTML = "$" + total_price.toFixed(2);
}