const $table = $('#table');
const $availability_table = $('#table-availability');
const $result_table = $('#table-result');
let selections = [];
var project_socket;
var event_socket;


$(document).ready(function () {
    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });

    event_socket = new ReconnectingEventSource('ws://'+ window.location.host+'/events/');

    event_socket.addEventListener('stream-error', function (e) {
        // hard stop
        event_socket.close();
        e = JSON.parse(e.data);
        console.log('stream error: ' + e.condition + ': ' + e.text);
    }, false);

    event_socket.addEventListener('message', function (e) {
        resp = JSON.parse(e.data)
        if (resp.text === "result") {
            get_result(project_id);
        } else if (resp.text === "stats") {
            get_statistics(project_id);
        }

    }, false);

    event_socket.addEventListener('stream-reset', function (e) {
        // ... client fell behind, reinitialize ...
    }, false);

    // Send the data using post
    let posting = $.get('/scheduler/get_project', {project: project_id});

    // Put the results in a div
    posting
        .done(function (data) {
            initTable(data);
            $('#project_name').text(data.name);
            init_availability_table(data);
            get_availability($('#member_name').data('uid'));
            get_user_info($('#member_name').data('uid'));
            // init_result_table(data);
            get_result(project_id);
            get_statistics(project_id);
        });

    $('#upload_project_button').on('click', function (e) {
        upload_project();
    });

    $('.member-link').on('click', function (e) {
        get_availability($(this).data('uid'));
        get_user_info($(this).data('uid'));
        $('#member_name').text($(this).text())
        $('#member_name').data('uid', $(this).data('uid'))
    });

    $('#update_periods').on('click', function (e) {
        save_period_count(e)
    });

    $('#update_schedule').on('click', function (e) {
        update_schedule(e)
    });

    $('#scheduler_button').on('click', function (e) {
        run_scheduler();
    });

    $('#stats_button').on('click', function (e) {
        create_stats();
    });
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
            data_row[column] = create_input(row, column, data.data[row][column])
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
    return `<input class=form-control onchange='update_cell(this)' type='number' value=${value} id=${id}_${field}>`
}

function update_cell(element) {
    let id_field = element.id.split(/_(.+)/);
    let id = id_field[0];
    let field = id_field[1];
    $table.bootstrapTable('updateCellByUniqueId', {
        id: id,
        field: field,
        value: create_input(id, field, parseInt(element.value))
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

function upload_project() {
    let name = $('#project_name').text();
    let post_data = {name: name, columns: [], order: []};
    let data = {};

    $table.bootstrapTable('getOptions').columns[0].forEach(function (column) {
        if (column.field !== 'slots') {
            post_data['columns'].push(column.field);
        }
    });

    $table.bootstrapTable('getData').forEach(function (row) {
        data[row.slots] = {};
        post_data['order'].push(row.slots);
        post_data.columns.forEach(function (column) {
            data[row.slots][column] = $(row[column]).val()
        })
    });
    post_data['data'] = data;

    let url = "/scheduler/save_project";

    // Send the data using post
    let posting = $.post(url, {data: JSON.stringify(post_data)});

    // TODO: tell user about succesfull saving
    posting
        .done(function (data) {
            console.log('Project was saved');
        })
        .fail(function (data) {
            console.log('Project was not saved');
        })
}

function init_availability_table(data) {
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
            data_row[column] = create_availability_input(row, column)
        });
        cell_data.push(data_row)
    });


    $availability_table.bootstrapTable('destroy').bootstrapTable({
        locale: "en-US",
        data: cell_data,
        columns: columns
    });
}

function create_availability_input(id, field, value) {
    let checked = value ? ('checked') : ("");
    return `<input type="checkbox" onchange='update_cell(this)' class="form-check-input" id="${id}_${field}" ${checked} disabled>`
}

function get_availability(user_id) {
    let data = {project: project_id, user_id: user_id};

    let url = "/scheduler/get_availability_json";

    // Send the data using post
    let posting = $.get(url, {data: JSON.stringify(data)})
        .done(function (resp) {
            if (resp.status === 'Success') {
                update_availability_table(resp);
            } else if (resp.status === 'Failed') {
                $availability_table.bootstrapTable('filterBy', {id: [0]})
            }
        })
        .fail(function (data) {
            alert('error')
        });
}

function get_user_info(user_id) {
    let data = {project: project_id, user_id: user_id};

    let url = "/scheduler/user_info";

    let posting = $.get(url, {data: JSON.stringify(data)})
        .done(function (data) {
            if (data.status === 'Success') {
                update_info(data.data);
            }
        })
        .fail(function () {
            alert('error')
        });
}

function update_info(data) {
    $('#period_count').val(data.hours);
}

function save_period_count() {
    let name = $('#project_name').text();
    let post_data = {name: name, period_count: $('#period_count').val(), user: $('#member_name').data('uid')};

    let url = "/scheduler/save_period";

    let posting = $.post(url, {data: JSON.stringify(post_data)});

    posting
        .done(function (resp) {
            alert('success');
        })
        .fail(function (resp) {
            alert('error')
        })
}

function update_availability_table(data) {
    data.rows.forEach(function (row) {
        data.columns.forEach(function (column) {
            data.data[row][column] = create_availability_input(row, column, data.data[row][column] === true)
        });
        $availability_table.bootstrapTable('updateByUniqueId', {id: row, row: data.data[row]});
    });
    
    $availability_table.bootstrapTable('refreshOptions', {})
}

function clear_availability_table() {

}

function init_result_table(data) {
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

    let url = "/scheduler/get_result_json";

    // Send the data using post
    let posting = $.get(url, data)
        .done(function (resp) {
            if (resp.status === 'Success') {
                init_result_table(resp);

                update_result_table(resp);
                colour_result_table();
                $('#logs').val(resp.logs);
            }
        })
        .fail(function (resp) {
            alert('error')
        });
}

function create_result_input(id, field, selected, staff) {
    let select = $('<select multiple>');
    $(select).attr("id", `${id}_${field}`);
    $(select).attr("class", "form-control result_input_select");
    // $(select).attr("onchange", "update_result_cell(this)");

    if (selected === []) {
        $(select).append(`<option value="None" selected>x</option>`)
    } else {
        $(select).append(`<option value="None">x</option>`)
    }
    staff.forEach(function (name) {
        if (selected.includes(name)) {
            $(select).append(`<option value="${name}" selected>${name}</option>`)
        } else {
            $(select).append(`<option value="${name}">${name}</option>`)
        }
    });

    return $(select).prop('outerHTML');
}

function update_result_cell(element) {
    let id_field = element.id.split(/_(.+)/);
    let id = id_field[0];
    let field = id_field[1];
    $result_table.bootstrapTable('updateCellByUniqueId', {
        id: id,
        field: field,
        value: create_result_input(id, field, element.value, Array.from(element.options).map(option => option.value))
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

function get_statistics() {
    let data = {project: project_id};

    let url = "/scheduler/get_project_statistics";

    // Send the data using post
    let posting = $.get(url, data)
        .done(function (resp) {
            if (resp.status === 'Success') {
                $('#stats').val(resp.stats)
            }
        })
        .fail(function (resp) {
            alert('error')
        });
}

function create_stats() {
    let data = {project: project_id};

    let url = "/scheduler/create_project_statistics";

    // Send the data using post
    let posting = $.get(url, data)
        .done(function (resp) {
            get_statistics();
        })
        .fail(function (resp) {
            console.log(resp)
        });
}

function run_scheduler() {
    let data = {project: project_id};

    let url = "/scheduler/create_schedule";

    // Send the data using post
    let posting = $.get(url, data)
        .done(function (resp) {
            get_result();
        })
        .fail(function (resp) {
            console.log(resp)
        });
}

function update_schedule() {
    let name = $('#project_name').text();
    let post_data = {name: name, columns: [], order: [], config: {}};
    let data = {};

    $result_table.bootstrapTable('getOptions').columns[0].forEach(function (column) {

        if (column.field !== 'slots') {
            post_data['columns'].push(column.field);
        }
    });

    $result_table.bootstrapTable('getData').forEach(function (row) {
        data[row.slots] = {};
        post_data['order'].push(row.slots);
        post_data.columns.forEach(function (column) {
            data[row.slots][column] = $(row[column]).val()
        })
    });
    post_data['data'] = data;

    let url = "/scheduler/update_schedule";

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