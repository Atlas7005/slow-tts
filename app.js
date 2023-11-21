document.getElementById("listenBtn").addEventListener("click", function (event) {
    event.preventDefault()
});

class Validator {
    /*
      * Determines whether the channel name is valid
      * param string is the channel name
    */
    isAZ(string) {
        var res = string.match(/^(#)?[a-zA-Z0-9_]{4,25}$/);
        return (res !== null)
    }
}

class TTS {
    /*
      * On Construct
      * Speak message, determine whether polly is checked 
      * Write message regardless
    */
    constructor(message, tags) {
        this.speak(message, tags, this.speechType(), this.announceFlag());
        this.write(message, tags);
    }
    /*
      * Determines whether to use Polly or browser based speech
    */
    speechType() {
        return "browser";
    }
    /*
      * Speaks a message
      * param message is the tmi.js twitch message
      * param tags are the tags sent through tmi.js
      * param type is speaking through polly or browser based
    */
    announceFlag() {
        if (document.getElementById('announcechatter').checked) {
            return true;
        }
        if (!document.getElementById('announcechatter').checked) {
            return false;
        }
    }

    speak(message, tags, type, announceflag) {
        if (type == 'browser') {
            if (announceflag == true) {
                var chatter = tags['display-name'];
                message = chatter + " siger " + message;
            }
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.volume = document.querySelector('#volume').value;

            const voices = speechSynthesis.getVoices();
            var voiceSelect = document.getElementById('voiceSelect');
            const selectedOption = voiceSelect.selectedOptions[0].getAttribute("data-name");
            for (let i = 0; i < voices.length; i++) {
                if (voices[i].name === selectedOption) {
                    utterance.voice = voices[i];
                }
            }

            window.speechSynthesis.speak(utterance);
        }
    }
    /*
      * write a message to the browser
      * param message is the tmi.js twitch message
      * param tags are the tags sent through tmi.js
    */
    write(message, tags) {
        let div = document.createElement('div');
        div.className = "single-message";

        let chatter = document.createElement('span');
        chatter.className = "chatter";
        chatter.style.color = tags['color'];
        chatter.textContent = tags['display-name'] + ': ';

        let chatMessage = document.createElement('span');
        chatMessage.className = "messageContent";
        chatMessage.textContent = message;

        div.appendChild(chatter);
        div.appendChild(chatMessage);

        document.getElementById("messages").appendChild(div);
    }
}
/*
  * Starts routing the request
  * Validates the channel name 
  * if valid, starts listening for messages
*/
function startListening() {
    var validator = new Validator;
    const statusElement = document.querySelector('#status');
    const channel = document.querySelector("#channelname").value;
    if (validator.isAZ(channel) == false) {
        statusElement.className = "alert alert-danger";
        statusElement.textContent = "Please enter a valid channel name.";
    }
    else {
        const client = new tmi.Client({
            connection: {
                secure: true,
                reconnect: true,
            },
            channels: [channel],
        });

        document.getElementById("listenBtn").textContent = "Listening...";
        document.getElementById("listenBtn").disabled = true;
        statusElement.className = "alert alert-success";

        client.connect().then(() => {
            statusElement.textContent = `Connected to twitch. Listening for messages in ${channel}...`;
        });

        client.on('message', (wat, tags, message, self) => {
            manageOptions(tags, message);
        });
    }
}

function manageOptions(tags, message) {
    const badges = tags.badges || {};
    const isBroadcaster = badges.broadcaster;
    const isMod = badges.moderator;

    const excludedchatterstextarea = document.getElementById('excluded-chatters');
    var lines = excludedchatterstextarea.value.split('\n');
    var lines = lines.map(line => line.toLowerCase());

    if (document.getElementById('modsonly').checked) {
        if (isBroadcaster || isMod) {
            new TTS(message, tags);
            return;
        }
    }
    if (document.getElementById('exclude-toggle').checked) {
        console.log(lines);
        if (lines.includes(tags['display-name'].toLowerCase())) {
            return;
        }
        else {
            new TTS(message, tags);
            console.log('not in lines');
            return;
        }
    }
    else {
        new TTS(message, tags);
        return;
    }
}

function populateVoiceList() {
    if (typeof speechSynthesis === "undefined") {
        return;
    }
    const voices = speechSynthesis.getVoices();
    for (let i = 0; i < voices.length; i++) {
        const option = document.createElement("option");
        option.textContent = `${voices[i].name} (${voices[i].lang})`;

        option.setAttribute("data-lang", voices[i].lang);
        option.setAttribute("data-name", voices[i].name);
        document.getElementById("voiceSelect").appendChild(option);
    }
}

function exportSettings() {
    var channelName = document.querySelector("#channelname").value;
    document.getElementById('settingsURL').value = "https://twitchtts.net?channelname=" + channelName;
    if (channelName == "") {
        alert("You do not have a channel name entered. Please enter a channel name to generate a URL.");
        document.getElementById('settingsURL').value = "";
    }
}

function copyURL() {
    var copyText = document.getElementById('settingsURL');
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Copied URL to clipboard.");
}

function skipMessage() {
    //stops Browser speech
    window.speechSynthesis.cancel();
}

/*
  * If Channel Name is in the URL, autostart listening
*/

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
if (urlParams.get('channelname') !== null) {
    document.querySelector("#channelname").value = urlParams.get('channelname');
    document.getElementById('announcechatter').checked = true;
    document.getElementById('exclude-toggle').checked = true;
    document.getElementById('exclude-options').classList.remove('d-none');
    fillInBots();
    startListening();
};

window.speechSynthesis.onvoiceschanged = function () {
    populateVoiceList();
}

/*
  Fills in the excluded chatters list with a predefined list of known moderation bots
*/
function fillInBots() {
    var excludedChatters = document.getElementById("excluded-chatters");
    excludedChatters.value = "Nightbot\nMoobot\nStreamElements\nStreamlabs\nFossabot";
}