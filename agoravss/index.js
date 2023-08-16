const express = require('express');
//const gfgFns = require('agoranpm')
const AgoraRTM = require('agora-rtm-sdk')
const app = express();
const PORT = 3005;
app.use(express.static(__dirname));

// gfgFns.add(4,5);
app.listen(PORT, (error) => {
    if (!error)
        console.log("Server is Successfully Running, and App is listening on port " + PORT)
    else
        console.log("Error occurred, server can't start", error);
}
);


// app.get('/home', function (req, res) {
//     res.sendFile('/lobby.html', { root: __dirname })
// })

let joinRoomInit = async (displayName, APP_ID) => {
    rtmClient = await AgoraRTM.createInstance(APP_ID)
    //await rtmClient.login({ uid, token })

    //await rtmClient.addOrUpdateLocalUserAttributes({ 'name': displayName })

    // channel = await rtmClient.createChannel(roomId)
    // await channel.join()

    // channel.on('MemberJoined', handleMemberJoined)
    // channel.on('MemberLeft', handleMemberLeft)
    // channel.on('ChannelMessage', handleChannelMessage)
    //channel.on('ChannelWhiteboard')
    // channel.on('ChannelMessage', ({ text }, senderId) => {
    //     console.log("Message received successfully.");
    //     console.log("The message is: " + text + " by " + senderId);
    //     document.getElementById("actual-text").insertAdjacentHTML("afterend","<br> <b>Speaker:</b> " + senderId + "<br> <b>Message:</b> " + text + "<br>");
    // });
    // getMembers()
    // addBotMessageToDom(`Welcome to the room ${displayName}! 👋`)

    // client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    // await client.join(APP_ID, roomId, token, uid)

    // client.on('user-published', handleUserPublished)
    // client.on('user-left', handleUserLeft)
}

joinRoomInit("surendra","f34e0126cc534ec5af7629916748cda0")



