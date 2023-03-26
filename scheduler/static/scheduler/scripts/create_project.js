const $table = $('#table');
const $remove = $('#remove');
let selections = [];
let global_id = 0;


$(function () {
    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });

    initTable([
        {
            field: 'ck',
            checkbox: true
        },
        {
            field: 'slots',
            title: 'Slot',
            sortable: false,
            align: 'left',
        },
    ]);

    $('#add_column').on('click', function (e) {
        add_column($('#add_column_name').val());
        $('#add_column_name').val('');
    });
    $('#add_column_name').keyup(function (e) {
        if (e.keyCode === 13) {
            add_column($('#add_column_name').val());
            $('#add_column_name').val('');
        }
    });

    $('#add_row').on('click', function (e) {
        add_row($('#add_row_name').val());
        $('#add_row_name').val('')
    });
    $('#add_row_name').keyup(function (e) {
        if (e.keyCode === 13) {
            add_row($('#add_row_name').val());
            $('#add_row_name').val('');
        }
    });

    $('#upload_project_button').on('click', function (e) {
        upload_project();
    })
});

function getIdSelections() {
    return $.map($table.bootstrapTable('getSelections'), function (row) {
        return row.id
    })
}

function responseHandler(res) {
    $.each(res.rows, function (i, row) {
        row.state = $.inArray(row.id, selections) !== -1
    });
    return res
}

window.operateEvents = {
    'click .like': function (e, value, row, index) {
        alert('You click like action, row: ' + JSON.stringify(row))
    },
    'click .remove': function (e, value, row, index) {
        $table.bootstrapTable('remove', {
            field: 'id',
            values: [row.id]
        })
    }
};

function initTable(columns) {
    $table.bootstrapTable('destroy').bootstrapTable({
        height: window.innerHeight - 100,
        locale: "en-US",
        columns: columns,
    });
    $table.on('check.bs.table uncheck.bs.table ' +
        'check-all.bs.table uncheck-all.bs.table',
        function () {
            $remove.prop('disabled', !$table.bootstrapTable('getSelections').length);

            // save your data, here just save the current page
            selections = getIdSelections()
            // push or splice the selections if you want to save all data selections
        });
    // $table.on('all.bs.table', function (e, name, args) {
    //     console.log(name, args)
    // });
    $remove.click(function () {
        let ids = getIdSelections();

        $table.bootstrapTable('remove', {
            field: 'id',
            values: ids
        });
        $remove.prop('disabled', true)
    })
}

function updateTable(new_column) {
    const new_columns = [];
    let field = "custom_" + new_column;

    $table.bootstrapTable('getOptions').columns[0].forEach(function (column) {
        new_columns.push(column);
    });

    new_columns.push({
        field: field,
        title: new_column,
        sortable: false,
        align: 'center'
    });

    $table.bootstrapTable('refreshOptions', {columns: new_columns});

    $table.bootstrapTable('getData').forEach(function (row) {
        $table.bootstrapTable('updateCellByUniqueId', {
            id: row.id,
            field: field,
            value: create_input(row.id, field)
        });
    });

    $table.bootstrapTable('refreshOptions', {columns: new_columns});
}

function create_input(id, field, value) {
    let default_count = value || get_default_count();
    return `<input class=form-control onchange='update_cell(this)' type='number' value=${default_count} id=${id}_${field}>`
}

function get_default_count() {
    return Number($('#default_count').val()) || 0
}

function update_cell(element) {
    let id_field = element.id.split(/_(.+)/);
    let id = id_field[0];
    let field = id_field[1];
    $table.bootstrapTable('updateCellByUniqueId', {id: id, field: field, value: create_input(id, field, parseInt(element.value))})
}

function add_column(column_name) {
    $table.bootstrapTable('getOptions').columns[0].forEach(function (column) {
        if (column.title === column_name) {
            alert(column.title + ' is already declared.');
            throw "Duplicate Column";
        }
    });
    updateTable(column_name);
}

function add_row(row_name) {
    $table.bootstrapTable('getData').forEach(function (row) {
        if (row.slots === row_name) {
            alert(row_name + ' is already declared.');
            throw "Duplicate Row";
        }
    });

    const data = {slots: row_name, id: ++global_id};

    $table.bootstrapTable('getOptions').columns[0].forEach(function (column) {

        if (column.field.split('_')[0] === 'custom') {
            data[column.field] = create_input(global_id, column.field);
        }
    });

    $table.bootstrapTable('append', data)
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
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
    let name = $('#project_name').val() || 'placeholder';
    let post_data = {name: name, columns: [], order: [], config: {}};
    post_data['config']['default_hours'] = $('#default_hours').val();
    let data = {};

    $table.bootstrapTable('getOptions').columns[0].forEach(function (column) {

        if (column.field.split('_')[0] === 'custom') {
            post_data['columns'].push(column.field.split('_')[1]);
        }
    });

    $table.bootstrapTable('getData').forEach(function (row) {
        data[row.slots] = {};
        post_data['order'].push(row.slots);
        post_data.columns.forEach(function (column) {
            data[row.slots][column] = $(row['custom_'+column]).val()
        })
    });
    post_data['data'] = data;

    let url = "/scheduler/save_project";

    // Send the data using post
    let posting = $.post(url, {data: JSON.stringify(post_data)});

    // Put the results in a div
    posting
        .done(function (data) {
            console.log(data);
            alert('success');
        })
        .fail(function (data) {
            alert('error')
        })
}