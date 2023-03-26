const $table = $('#table');
const $result_table = $('#table-schedule');
let selections = [];


$(document).ready(function () {
    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });

    // Send the data using post
    let posting = $.get('/scheduler/get_project', {project: project_id});

    // Put the results in a div
    posting
        .done(function (data) {
            initTable(data);
            $('#project_name').text(data.name);
            get_availability()
            get_result(project_id);
        })
        .fail(function (data) {
            alert('error')
        });

    $('#upload_availability_button').on('click', function (e) {
        upload_availability();
    })
});

function initTable(data) {
    let columns = [{field: 'slots', title: 'slots', sortable: false, 'align': 'centered'}];
    let cell_data = [];
    data.columns.forEach(function (column) {
        columns.push({
            'field': column,
            'title': column,
            'sortable': false,
            'align': 'centered'
        })
    });

    data.rows.forEach(function (row) {
        let data_row = {slots: row}
        data.columns.forEach(function (column) {
            data_row[column] = create_input(row, column)
        });
        cell_data.push(data_row);
    });

    $table.bootstrapTable('destroy').bootstrapTable({
        height: window.innerHeight * 0.8,
        locale: "en-US",
        data: cell_data,
        columns: columns
    });

    $table.on('check.bs.table uncheck.bs.table ' +
        'check-all.bs.table uncheck-all.bs.table',
        function () {
            $remove.prop('disabled', !$table.bootstrapTable('getSelections').length);

            // save your data, here just save the current page
            selections = getIdSelections()
            // push or splice the selections if you want to save all data selections
        });

}

function create_input(id, field, value) {
    let checked = value ? ('checked') : ("");
    return `<input type="checkbox" onchange='update_cell(this)' class="form-check-input" id="${id}_${field}" ${checked}>`
}

function update_cell(element) {
    let id_field = element.id.split(/_(.+)/);
    let id = id_field[0];
    let field = id_field[1];
    $table.bootstrapTable('updateCellByUniqueId', {
        id: id,
        field: field,
        value: create_input(id, field, element.checked)
    })
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function upload_availability() {
    let name = $('#project_name').text() || 'placeholder';
    let post_data = {project_id: project_id, name: name, columns: []};
    let data = {};

    $table.bootstrapTable('getOptions').columns[0].forEach(function (column) {
        if (column.field !== 'slots') {
            post_data['columns'].push(column.field);
        }
    });

    $table.bootstrapTable('getData').forEach(function (row) {
        data[row.slots] = {};
        post_data.columns.forEach(function (column) {
            data[row.slots][column] = $(row[column]).is(':checked')
        })
    });
    post_data['data'] = data;

    let url = "/scheduler/save_availability";

    // Send the data using post
    let posting = $.post(url, {data: JSON.stringify(post_data)});

    // Put the results in a div
    posting
        .done(function (data) {
            alert('success');
        })
        .fail(function (data) {
            alert('error')
        })
}


function get_availability() {
    let data = {project: project_id};

    let url = "/scheduler/get_availability_json";

    // Send the data using post
    let posting = $.get(url, {data: JSON.stringify(data)})
        .done(function (data) {
            updateTable(data)
        })
        .fail(function (data) {
            alert('error')
        });
}

function updateTable(data) {
    data.rows.forEach(function (row) {
        data.columns.forEach(function (column) {
            data.data[row][column] = create_input(row, column, data.data[row][column] === true)
        });
        $table.bootstrapTable('updateByUniqueId', {id: row, row: data.data[row]});
    });
}

function init_result_table(data) {
    let columns = [];
    let cell_data = [];
    data.columns.forEach(function (column) {
        columns.push({
            'field': column,
            'title': column,
            'sortable': false,
            'align': 'centered'
        })
    });

    data.rows.forEach(function (row) {
        let data_row = {slots: row}

        data.columns.forEach(function (column) {
            data_row[column] = null
        });
        cell_data.push(data_row)
    });

    $result_table.bootstrapTable('destroy').bootstrapTable({
        locale: "en-US",
        data: cell_data,
        columns: columns
    });
}

function get_result() {
    let data = {project: project_id};

    let url = "/scheduler/get_personal_result_json";

    // Send the data using post
    let posting = $.get(url, data)
        .done(function (resp) {
            if (resp.status === 'Success') {
                init_result_table(resp);

                update_result_table(resp);
                colour_result_table();
            }
        })
        .fail(function (resp) {
            alert('error')
        });
}

function create_result_input(id, field, selected, staff) {
    if (selected.includes(staff)) {
        return staff
    }
    return '-';
}

function update_result_cell(element) {
    let id_field = element.id.split(/_(.+)/);
    let id = id_field[0];
    let field = id_field[1];
    $result_table.bootstrapTable('updateCellByUniqueId', {
        id: id,
        field: field,
        value: create_result_input(id, field, element.value)
    })
}

function colour_result_table() {
    let prev_id = null;
    let colour_choice = 0;
    let colours = ['lightgrey', 'white'];
    $result_table.find('tbody').find('tr').each(function () {
        let row_id = $.trim(this.getAttribute('data-uniqueid'));
        if (row_id !== prev_id) {
            colour_choice = (colour_choice + 1) % 2;
        }
        $(this).css('background-color', colours[colour_choice]);

        prev_id = row_id;
    })
}

function update_result_table(data) {
    data.rows.forEach(function (row) {
        data.columns.forEach(function (column) {
            data.data[row][column] = create_result_input(row, column, data.data[row][column], data.staff)
        });
        $result_table.bootstrapTable('updateByUniqueId', {id: row, row: data.data[row]});
    })
}