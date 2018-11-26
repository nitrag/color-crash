// 1. import ask persistence adapter
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
// 2. initialize the skill builder with adapter
const skillBuilder = Alexa.SkillBuilders.custom().withPersistenceAdapter(
    new persistenceAdapter.S3PersistenceAdapter({bucketName: process.env.S3_PERSISTENCE_BUCKET})
);

/**
 var scoreboard = {
  players: [
    {color: "yellow", score: 4},
    {color: "blue", score: 3},
    {color: "red", score: 7},
  ],
  round: 1
}
 **/

const Persistance = {
// 3. sample handler to save attributes
    async saveScores(handlerInput, scoreboard) {
        const attributesManager = handlerInput.attributesManager;
        attributesManager.setPersistentAttributes(s3Attributes);
        await attributesManager.savePersistentAttributes();
        return handlerInput;
    },

// 4. sample handler to read attributes
    async getScores(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const s3Attributes = await attributesManager.getPersistentAttributes() || {};
        return scoreboard;
    }
};

module.exports = {
    getScores: getScores,
    saveScores: saveScores
}