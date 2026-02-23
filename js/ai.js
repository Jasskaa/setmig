export class AI {
    constructor(game) {
        this.game = game;
    }

    playTurn() {
        const aiPlayer = this.game.getActivePlayer();
        const opponent = this.game.getOpponent();
        console.log(`[IA] Torn iniciat. Analitzant ${aiPlayer.hand.length} cartes.`);

        let bestMove = { score: -1, card: null, targetPlayer: null, targetOrganIndex: null, isDiscard: true };

        aiPlayer.hand.forEach(card => {
            // Avaluar jugar Òrgan
            if (card.type === 'ORGAN' && !aiPlayer.hasOrgan(card.color)) {
                this.evaluateMove(bestMove, card, aiPlayer, null, 100, "Jugar òrgan nou");
            }
            
            // Avaluar Medicina
            if (card.type === 'MEDICINE') {
                aiPlayer.body.forEach((organ, idx) => {
                    if (organ.color === card.color) {
                        if (organ.viruses.length > 0) this.evaluateMove(bestMove, card, aiPlayer, idx, 90, "Curar òrgan infectat");
                        else if (organ.medicines.length === 0) this.evaluateMove(bestMove, card, aiPlayer, idx, 60, "Vacunar òrgan");
                        else if (organ.medicines.length === 1) this.evaluateMove(bestMove, card, aiPlayer, idx, 70, "Immunitzar òrgan");
                    }
                });
            }

            // Avaluar Virus
            if (card.type === 'VIRUS') {
                opponent.body.forEach((organ, idx) => {
                    if (organ.color === card.color && organ.medicines.length < 2) {
                        if (organ.viruses.length === 1) this.evaluateMove(bestMove, card, opponent, idx, 85, "Destruir òrgan rival");
                        else if (organ.medicines.length === 1) this.evaluateMove(bestMove, card, opponent, idx, 50, "Treure vacuna rival");
                        else this.evaluateMove(bestMove, card, opponent, idx, 80, "Infectar òrgan sa rival");
                    }
                });
            }

            // Avaluar Tractaments globals
            if (card.type === 'TREATMENT') {
                if (card.title === 'Error Mèdic') {
                    const aiHealthy = aiPlayer.body.filter(o => o.viruses.length===0).length;
                    const oppHealthy = opponent.body.filter(o => o.viruses.length===0).length;
                    if (oppHealthy > aiHealthy) this.evaluateMove(bestMove, card, opponent, null, 150, "Robar cos millor del rival");
                }
                if (card.title === 'Contagi') {
                    let possibleTransmissions = 0;
                    aiPlayer.body.forEach(myO => {
                        if (myO.viruses.length > 0) {
                            if (opponent.body.some(opO => opO.color === myO.color && opO.medicines.length < 2)) {
                                possibleTransmissions++;
                            }
                        }
                    });
                    if (possibleTransmissions > 0) this.evaluateMove(bestMove, card, opponent, null, 75 + possibleTransmissions*10, "Contagiar virus");
                }
            }
        });

        if (bestMove.score > -1) {
            console.log(`[IA] Decisió: ${bestMove.logMsg} amb la carta ${bestMove.card.title} (${bestMove.card.color}). Puntuació: ${bestMove.score}`);
            this.game.executeMove(bestMove.card, bestMove.targetPlayer, bestMove.targetOrganIndex);
        } else {
            // Descartar aleatòriament si no hi ha cap jugada útil
            const cardToDiscard = aiPlayer.hand[0];
            console.log(`[IA] Cap jugada útil. Descartant carta: ${cardToDiscard.title} (${cardToDiscard.color}).`);
            this.game.discardCard(cardToDiscard);
        }
    }

    evaluateMove(bestMove, card, targetPlayer, targetOrganIndex, score, logMsg) {
        if (score > bestMove.score) {
            bestMove.score = score;
            bestMove.card = card;
            bestMove.targetPlayer = targetPlayer;
            bestMove.targetOrganIndex = targetOrganIndex;
            bestMove.isDiscard = false;
            bestMove.logMsg = logMsg;
        }
    }
}