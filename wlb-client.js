$(function () {
    "use strict";

    // for better performance - to avoid searching in DOM
    var name = $('#name');
    var gameName = $('#game');
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');
    var playButton = $('#playButton');

    // my color assigned by the server
    var myColor = false;
    // my name sent to the server
    var myName = false;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('ws://54.217.245.45');

    connection.onopen = function () {
        // first we want users to enter their names
        input.removeAttr('disabled');
        input.attr('placeholder', 'Choose name:');
    };

    connection.onerror = function (error) {
        // just in there were some problems with conenction...
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.' } ));
    };

    // most important part - incoming messages
    connection.onmessage = function (message) {
        // try to parse JSON message. Because we know that the server always returns
        // JSON this should work without any problem but we should make sure that
        // the massage is not chunked or otherwise damaged.
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        if (json.type === 'color') { // first response from the server with user's color
            myColor = json.data;
            status.text(myName + ': ').css('color', myColor);
            input.removeAttr('disabled').focus();
            // from now user can start sending messages
        } else if (json.type === 'gamestate') { // game state changed
          if (json.data === 'ready') {
            playButton.css('display', 'inline');
          } else if (json.data === 'waiting') {
            playButton.css('display', 'none');
          }
        } else if (json.type === 'outcome') { // it's a single message
          var outcome = json.data;
          content.html($('<p>', { text: outcome} ));
          $('html').addClass(outcome.toLowerCase());
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    };

    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
            var jsonMessage = {type: 'name', data: msg};
            // send the message as an ordinary text
            connection.send(JSON.stringify(jsonMessage));
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response
            input.css('display', 'none');

            // we know that the first message sent from a user their name
            if (myName === false) {
                myName = msg;
            }
        }
    });
    
    playButton.click(function(e) {
        var jsonMessage = {type: 'action', data: 'play'};
        content.html('');
        $('html').removeClass();
        connection.send(JSON.stringify(jsonMessage));
    });

    /**
     * This method is optional. If the server wasn't able to respond to the
     * in 3 seconds then show some error message to notify the user that
     * something is wrong.
     */
    setInterval(function() {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to comminucate '
                                                 + 'with the WebSocket server.');
        }
    }, 3000);
});
