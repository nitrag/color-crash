/*
 * Copyright 2018 Amazon.com, Inc. and its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

'use strict';

const Alexa = require('ask-sdk-core');
// Gadget Directives Builder
const GadgetDirectives = require('util/gadgetDirectives.js');
// Basic Animation Helper Library
const BasicAnimations = require('button_animations/basicAnimations.js');
// import the skill settings constants
const Settings = require('settings.js');



// Define a recognizer for button down events that will match when any button is pressed down.
// We'll use this recognizer as trigger source for the "button_down_event" during play
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#recognizers
const DIRECT_BUTTON_DOWN_RECOGNIZER = {
    "button_down_recognizer": {
        "type": "match",
        "fuzzy": false,
        "anchor": "end",
        "pattern": [{
                "action": "down"
            }
        ]
    }
};

// Define named events based on the DIRECT_BUTTON_DOWN_RECOGNIZER and the built-in "timed out" recognizer
// to report back to the skill when either of the two buttons in play was pressed and eventually when the
// input handler times out
// see: https://developer.amazon.com/docs/gadget-skills/define-echo-button-events.html#define
const DIRECT_MODE_EVENTS = {
    "button_down_event": {
        "meets": ["button_down_recognizer"],
        "reports": "matches",
        "shouldEndInputHandler": false
    },
    "timeout": {
        "meets": ["timed out"],
        "reports": "history",
        "shouldEndInputHandler": true
    }
};


// ***********************************************************************
//   PLAY_MODE Handlers
//     set up handlers for events that are specific to the Play mode
//     after the user registered the buttons - this is the main mode
// ***********************************************************************
const GamePlay = {

    StartRoundHandler: function(handlerInput) {
        console.log("GamePlay::colorIntent");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { request } = handlerInput.requestEnvelope;

        let deviceIds = sessionAttributes.DeviceIDs;
        deviceIds = deviceIds.slice(-4);
        const colors = ["blue", "red", "green", "yellow"];
        const shuffled = shuffle(colors);
        sessionAttributes.scoreboard = {
          deviceIds: deviceIds,
          colors: colors,
          scores: []
        }
        sessionAttributes.ColorChoice = '#F0B000';

        // Build Start Input Handler Directive
        ctx.directives.push(GadgetDirectives.startInputHandler({
            'timeout': 10000,
            'recognizers': DIRECT_BUTTON_DOWN_RECOGNIZER,
            'events': DIRECT_MODE_EVENTS
        } ));

        // Save Input Handler Request ID
        sessionAttributes.CurrentInputHandlerID = request.requestId;
        console.log("Current Input Handler ID: " + sessionAttributes.CurrentInputHandlerID);

        // Build 'idle' breathing animation, based on the users color of choice, that will play immediately
        for(var i=0;i<deviceIds.length;i++){
          ctx.directives.push(GadgetDirectives.setIdleAnimation({
              'targetGadgets': deviceIds[i],
              'animations': BasicAnimations.BreatheAnimation(30, shuffled[i], 450)
          }));
        }

        for(var i=0;i<deviceIds.length;i++){
          // Build 'button down' animation, based on the users color of choice, for when the button is pressed
          ctx.directives.push(GadgetDirectives.setButtonDownAnimation({
              'targetGadgets': deviceIds[i],
              'animations': BasicAnimations.SolidAnimation(1, shuffled[i], 2000)
          }));
        }

        for(var i=0;i<deviceIds.length;i++){
          // build 'button up' animation, based on the users color of choice, for when the button is released
          ctx.directives.push(GadgetDirectives.setButtonUpAnimation({
              'targetGadgets': deviceIds[i],
              'animations': BasicAnimations.SolidAnimation(1, shuffled[i], 200)
          }));
        }

        ctx.outputSpeech = ["Ok. Each player, hit your color.."];
        ctx.outputSpeech.push(Settings.WAITING_AUDIO);

        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    },

    HandleTimeout: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::timeout");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        // The color the user chose
        const uColor = sessionAttributes.ColorChoice;
        ctx.outputSpeech = ["Round over. The scores are as follows: "];
        var scoreboard = sessionAttributes.scoreboard;
        for(var i=0;i<scoreboard.deviceIds.length;i++){
          ctx.outputSpeech.push(scoreboard.colors[i] + " player won " + scoreboard.scores[i] + " points.");
        }
        ctx.outputSpeech.push("That concludes the round, would you like to quit?");
        ctx.reprompt = ["Would you like to exit?"];
        ctx.reprompt.push("Say Yes to exit, or No to keep going");

        let deviceIds = sessionAttributes.DeviceIDs;

        // play a custom FadeOut animation, based on the user's selected color
        ctx.directives.push(GadgetDirectives.setIdleAnimation({
            'targetGadgets': deviceIds,
            'animations': BasicAnimations.FadeOutAnimation(1, 'white', 2000)
        }));
        // Reset button animation for skill exit
        ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonDown, {'targetGadgets': deviceIds } ));
        ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
            Settings.DEFAULT_ANIMATIONS.ButtonUp, {'targetGadgets': deviceIds } ));

        // Set Skill End flag
        sessionAttributes.expectingEndSkillConfirmation = true;
        sessionAttributes.state = Settings.SKILL_STATES.EXIT_MODE;

        ctx.openMicrophone = true;
        return handlerInput.responseBuilder.getResponse();
    },

    HandleButtonPressed: function(handlerInput) {
        console.log("GamePlay::InputHandlerEvent::button_down_event");
        const {attributesManager} = handlerInput;
        const ctx = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();

        let deviceIds = sessionAttributes.DeviceIDs;
        let gameInputEvents = ctx.gameInputEvents;
        let buttonId = gameInputEvents[0].gadgetId;

        // Checks for Invalid Button ID
        if (deviceIds.indexOf(buttonId) == -1) {

            console.log("Button event received for unregisterd gadget.");
            // Don't send any directives back to Alexa for invalid Button ID Events
            ctx.outputSpeech = ["Unregistered button"];
            ctx.outputSpeech.push("Only buttons registered during roll call are in play.");
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);
        } else {
            var buttonNo = deviceIds.indexOf(buttonId);
            ctx.outputSpeech = ["Button " + buttonNo + ". "];
            ctx.outputSpeech.push(Settings.WAITING_AUDIO);

            //get scores
            var scoreboard = sessionAttributes.scoreboard;
            var color
            scoreboard.scores[buttonNo] = 4 - scoreboard.scores.length;
            //modify

            //Save
        }

        ctx.openMicrophone = false;
        return handlerInput.responseBuilder.getResponse();
    }
};

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

module.exports = GamePlay;
