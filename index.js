const wizemen = require("@preciouswarrior/wiz.js");
const moment = require("moment");
const { app, Menu, Tray, shell, NodeEventEmitter, dialog } = require('electron');
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
var pkgInfo = require("pkginfo")(module);
let appIcon;

function Error(exception) {
    dialog.showErrorBox("Oops! An error occoured. ", `Help us improve your experience by sending an error report at ${module.exports.bugs}. The error that occoured was-: ${exception}`)
    process.exit(1);

}

process.on("unhandledRejection", exception => {
    Error(exception)
})

process.on("uncaughtException", exception => {
    Error(exception)
})


function isPossibleMeeting(meeting) {
    const currentTime = new Date()
    let meetingDate = moment.utc(meeting.start_date, ["D-MMM-YYYY"]).toDate();
    if (meetingDate.toDateString() != currentTime.toDateString()) { return false; }//meeting isnt today

    let meetingStart = moment(meeting.start_time, ["h:mm A"]).format("HH:mm").split(":");
    const meetingTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), meetingStart[0], meetingStart[1]);

    let difference = meetingTime.getTime() - currentTime.getTime();
    difference = difference / 60000;

    if (difference * -1 < meeting.duration - 10) { return true; }
    if (difference > 0 && difference < 10) { return true; }

    return false;

}

function scrapeAndLaunchMeetings() {
    client.getZoomMeetings().then(meetings => {
        let finalMeetings = []
        meetings.forEach(meeting => {
            if (isPossibleMeeting(meeting)) {
                finalMeetings.push(meeting)
            }

        })


        if (finalMeetings.length == 1) {
            launch(finalMeetings[0])

        }
        else if (finalMeetings.length > 1) { choose(finalMeetings) }
        else if (finalMeetings.length < 1 && meetings.length >= 1) { choose(meetings) }
        else {
            dialog.showMessageBox(null, {
                title: "Info",
                buttons: ["OK"],
                message: "No zoom meetings are currently scheduled for you.",
                type: "info"
            })
        }
    })

}

function launch(meeting) {
    shell.openExternal(meeting.join_url);
}


function choose(meetings) {


    dialog.showMessageBox(null, {
        title: "Info",
        buttons: ["Cancel", "Open Wizemen"],
        message: "There are conflicting meetings on wizemen. Currently, this application does not support choosing meetings. Please open wizemen on your web browser and launch your meetings from the website.",
        type: "info"
    }).then((response) => {
        if (response.response == 1) {
            shell.openExternal(client.api.rootLink + "classes/student/VirtualClassZoomStudent.aspx")
        }
    })

}

let config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));
let client = new wizemen.Client(config.email, config.password, config.schoolCode);

client.start().then(r => {
    setInterval(t => {
        client.refresh()
    }, client.REFRESHTIME);

    app.whenReady().then(() => {
        appIcon = new Tray('panther.png');
        appIcon.setToolTip("Click to launch meeting");

        const menu = Menu.buildFromTemplate([

            { label: "Launch meeting", type: "normal", click: scrapeAndLaunchMeetings },
            {
                label: "Edit Preferences", type: "normal", click: () => {
                    shell.openPath(path.join(__dirname, "config.json"))
                }
            },
            { label: "Quit", type: "normal", click: () => { process.exit() } }



        ])

        appIcon.setContextMenu(menu);
        appIcon.on("click", scrapeAndLaunchMeetings)


    })

})


