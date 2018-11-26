HandleSecondButtonCheckIn: function(handlerInput) {
    console.log("RollCall::InputHandlerEvent::second_button_checked_in");
    const {attributesManager} = handlerInput;
    const ctx = attributesManager.getRequestAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();
    const gameInputEvents = ctx.gameInputEvents;
    console.log("RollCall::InputHandlerEvent::second_button_checked_in");
    
    ctx.reprompt = ["Please pick a color: green, red, or blue"];
    ctx.outputSpeech = [];

    if (sessionAttributes.buttonCount == 0) {
        // just got both buttons at the same time
        ctx.outputSpeech.push("hello buttons 1 and 2");
        ctx.outputSpeech.push("<break time='1s'/>");
        ctx.outputSpeech.push("Awesome!");

        sessionAttributes.DeviceIDs[1] = gameInputEvents[0].gadgetId;
        sessionAttributes.DeviceIDs[2] = gameInputEvents[1].gadgetId;

    } else {
        // already had button 1, just got button 2..
        ctx.outputSpeech.push("hello, button 2");
        ctx.outputSpeech.push("<break time='1s'/>");
        ctx.outputSpeech.push("Awesome. I've registered two buttons.");

        if (sessionAttributes.DeviceIDs.indexOf(gameInputEvents[0].gadgetId) === -1) {
            sessionAttributes.DeviceIDs[2] = gameInputEvents[0].gadgetId;
        } else {
            sessionAttributes.DeviceIDs[2] = gameInputEvents[1].gadgetId;
        }                        
    }
    sessionAttributes.buttonCount = 2;
    
    // .. and ask use to pick a color for the next stage of the skill 
    ctx.outputSpeech.push("Now let's learn about button events.");
    ctx.outputSpeech.push("Please select one of the following colors: red, blue, or green.");                                  
        
    let deviceIds = sessionAttributes.DeviceIDs;
    deviceIds = deviceIds.slice(-2);

    // send an idle animation to registered buttons
    ctx.directives.push(GadgetDirectives.setIdleAnimation(
        ROLL_CALL_ANIMATIONS.RollCallComplete, { 'targetGadgets': deviceIds } ));
    // reset button press animations until the user chooses a color
    ctx.directives.push(GadgetDirectives.setButtonDownAnimation(
        Settings.DEFAULT_ANIMATIONS.ButtonDown));
    ctx.directives.push(GadgetDirectives.setButtonUpAnimation(
        Settings.DEFAULT_ANIMATIONS.ButtonUp));

    sessionAttributes.isRollCallComplete = true;
    sessionAttributes.state = Settings.SKILL_STATES.PLAY_MODE;

    ctx.openMicrophone = true;
    return handlerInput.responseBuilder.getResponse();
},