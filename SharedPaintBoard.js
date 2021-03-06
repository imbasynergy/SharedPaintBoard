window.SharedPaintBoard = function(){
    //constructor() {
        this.array_coordinates = [];

   // }



    const thisObj = this;

    this.sharedBoard = (data) => {
        /*
     * We keep two canvases to mimic remote user behaviour
     * Events from canvas_left should also reach canvas_right
     */

        $('.'+data.block_paint).append("<div class='paint-shared-top-setting' style='width:100%;height:25px;background-color:#ada5a5;display:flex;'>"
                +"<div class='shared-paint-setting-color' style='width:82px;margin-left:10px;margin-top:1px;cursor:pointer;'>"
                    +"Color <input type='color' class='shared-paint-setting-color-input'>"
                +"</div>"
                +"<div class='shared-paint-setting-width' style='width:120px;margin-left:15px;margin-top:4px;cursor:pointer;'>"
                    +"<div style='float:left;font-weight:bold'>Width</div> <input type='range' min='1' max='10' step='1' value='1' style='width: 65px'>"
                +"</div>"
            +"</div>");

        $('.'+data.block_mirror+'-'+data.board_id).append("<canvas id='room_videochat_canvas2' style='border:1px solid #000000; display: inline-block;float:left;width:150px;height:150px'></canvas>");

        $('.'+data.block_paint).append("<canvas id='room_videochat_canvas1' style='border:1px solid #000000; display: inline-block;float:left;'></canvas>");

        $('.'+data.block_mirror+' canvas').css("pointer-events", "none");


        var canvas_left = new fabric.Canvas('room_videochat_canvas1');
        var canvas_right = new fabric.Canvas('room_videochat_canvas2');
 

        $(".upper-canvas").css('width','150px!important');
        $("#room_videochat_canvas2").css('width','150px!important');



// is_down := keeps track if the mouse is down
// to distinguish mousemove and mousedrag
        var is_down = false;
        var count = 1;  // we use this to send different id each time. To make it feel like it is coming from different users.
        var myId = Math.floor(Math.random() * 10000)
        canvas_left.isDrawingMode = true;
        canvas_right.isDrawingMode = false;
        canvas_left.freeDrawingBrush.color = data.color;
        canvas_left.freeDrawingBrush.width = data.width;



        let canvas_paint = document.getElementById('room_videochat_canvas1');
        let ctx = canvas_paint.getContext('2d');
        ctx.fillStyle = "white";
        ctx.fillRect(0,0, 335,300);

        //array coordinates paint
        thisObj.array_coordinates['id'] = data.board_id;
        thisObj.array_coordinates['room_id'] = data.room_id;
        thisObj.array_coordinates['color'] = canvas_left.freeDrawingBrush.color;
        thisObj.array_coordinates['width'] = canvas_left.freeDrawingBrush.width;
        thisObj.array_coordinates['coordinates'] = [];



        $(".shared-paint-setting-color input").change(function () {
            canvas_left.freeDrawingBrush.color = this.value;
            thisObj.array_coordinates['color'] = this.value;
        })

        $(".shared-paint-setting-width input").change(function () {
            canvas_left.freeDrawingBrush.width = this.value;
            thisObj.array_coordinates['width'] = this.value;
        })




        /*
         * Publisher End:
         * Event listeners for canvas_left
         * These events need to be sent to the other canvas
         * in real application this data transfer would most likely happen via websockets */
        canvas_left.on('mouse:down', function (ev) {
            is_down = true;
            const point = this.getPointer(ev.e)
            const brush = ++count
            handle_mouse_down (brush, point);

            cometApi.web_pipe_send("web_paint.m_down", {userId: myId, brush: brush, point: point});
            // console.log({userId: myId, brush: brush, point: point});
            // console.log('down');
            thisObj.array_coordinates['coordinates'].push(point);
            return true;
        });
        canvas_left.on('mouse:move', function (ev) {
            if (!is_down)
                return true;
            const point = this.getPointer(ev.e)
            const brush = count

            handle_mouse_drag (brush, point);
            cometApi.web_pipe_send("web_paint.m_move", {userId: myId, brush: brush, point: point});
            // console.log({userId: myId, brush: brush, point: point});
            // console.log('move');
            thisObj.array_coordinates['coordinates'].push(point);
            return true;
        });
        canvas_left.on('mouse:up', function (ev) {
            is_down = false;
            const point = this.getPointer(ev.e)
            const brush = count
            handle_mouse_up (brush, point);
            cometApi.web_pipe_send("web_paint.m_up", {userId: myId, brush: brush, point: point});
            // console.log({userId: myId, brush: brush, point: point});

            // console.log(array_coordinates);
            // console.log('up');
            return true;
        });

        /*
         * Receiver end:
         * Here we receive events and act on them */
        var remote_brush = {};

        function handle_mouse_down(id, point) {
            var brush;
            // The id should be user_id so that we keep a brush instance
            // for every active user.
            // This gives us flexibility to create n number of paths in parallel.
            if (!remote_brush[id]) {
                remote_brush [id] = new fabric.PencilBrush(canvas_right);
            }

            brush = remote_brush [id];
            const options = {pointer: point, e: {}}
            brush.onMouseDown(point, options);

        }

        function handle_mouse_drag(id, point) {
            var brush = remote_brush [id];
            if (brush) {
                const options = {pointer: point, e: {}}
                brush.onMouseMove(point, options);
            }
        }

        function handle_mouse_up(id, point) {
            var brush = remote_brush [id];
            const options = {pointer: point, e: {}}
            brush.onMouseUp(point, options);
            delete remote_brush [id];
            console.log('up');
        }

        // function array_log(){
        //     console.log("???????????? ??????????????????");
        //     var canvas = document.getElementById('test_canvas');
        //     var ctx = canvas.getContext("2d");
        //     console.log(array_coordinates);
        //     array_coordinates['coordinates'].forEach(function (elem) {
        //         // console.log(elem);
        //     })
        // }
        // setInterval(array_log,5000);


// Subscribe to the channel in which chat messages will be sent.
        cometApi.subscription("web_paint.m_up", function (msg) {
            console.log(msg)
            handle_mouse_up(msg.data.brush, msg.data.point);
        });
        cometApi.subscription("web_paint.m_move", function (msg) {
            console.log(msg)
            handle_mouse_drag(msg.data.brush, msg.data.point);
        });
        cometApi.subscription("web_paint.m_down", function (msg) {
            console.log(msg)
            handle_mouse_down(msg.data.brush, msg.data.point);
        });

        cometApi.start({dev_id: data.board_id})



    }

    this.getArrayCoordinates = () => {
        return thisObj.array_coordinates;
    }

    this.deleteArrayCoordinates = () =>{
        thisObj.array_coordinates['coordinates'] = [];
    }

return this;
}



// const board = new SharedPaintBoard({});

