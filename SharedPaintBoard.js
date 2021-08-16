class SharedPaintBoard {
    sharedBoard(data) {
        /*
     * We keep two canvases to mimic remote user behaviour
     * Events from canvas_left should also reach canvas_right
     */

        $('.'+data.block_paint).append("<canvas id='room_videochat_canvas1' width='200' height='150' style='border:1px solid #000000; display: inline-block;float:left;'></canvas>");

        $('.'+data.block_mirror).append("<canvas id='room_videochat_canvas2' width='200' height='150' style='border:1px solid #000000; display: inline-block;float:left;'></canvas>");

        var canvas_left = new fabric.Canvas('room_videochat_canvas1');
        var canvas_right = new fabric.Canvas('room_videochat_canvas2');

// is_down := keeps track if the mouse is down
// to distinguish mousemove and mousedrag
        var is_down = false;
        var count = 1;  // we use this to send different id each time. To make it feel like it is coming from different users.
        var myId = Math.floor(Math.random() * 10000)
        canvas_left.isDrawingMode = true;
        canvas_right.isDrawingMode = true;

        /*
         * Publisher End:
         * Event listeners for canvas_left
         * These events need to be sent to the other canvas
         * in real application this data transfer would most likely happen via websockets */
        canvas_left.on('mouse:down', function (ev) {
            is_down = true;
            const point = this.getPointer(ev.e)
            const brush = ++count
            //handle_mouse_down (brush, point);

            cometApi.web_pipe_send("web_paint.m_down", {userId: myId, brush: brush, point: point});
            return true;
        });
        canvas_left.on('mouse:move', function (ev) {
            if (!is_down)
                return true;
            const point = this.getPointer(ev.e)
            const brush = count

            //handle_mouse_drag (brush, point);
            cometApi.web_pipe_send("web_paint.m_move", {userId: myId, brush: brush, point: point});
            return true;
        });
        canvas_left.on('mouse:up', function (ev) {
            is_down = false;
            const point = this.getPointer(ev.e)
            const brush = count
            //handle_mouse_up (brush, point);
            cometApi.web_pipe_send("web_paint.m_up", {userId: myId, brush: brush, point: point});
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
        }


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

        cometApi.start({dev_id: data.room_id})
    }
}

/**
 const board = SharedPaintBoard({
  id:"1", // string
  user_id:"123",  // string
  holderId: 'my-board', // id in dom tree document.getElementById('my-board')
})

 const img = board.getImage()
 board.makeMirror({
  id:"1", // string
  holderId: 'my-board',
})

 */