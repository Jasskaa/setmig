import { Game } from './models.js';
import { AI } from './ai.js';
import { View } from './view.js';


export class Controller {
    constructor() {
        this.view = new View();
        this.game = null;
        this.ai = null;
        this.selectedCard = null;

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btn-pve').addEventListener('click', () => this.startGame('PVE'));
        document.getElementById('btn-pvp').addEventListener('click', () => this.startGame('PVP'));
        document.getElementById('btn-restart').addEventListener('click', () => this.view.showScreen('start'));
        
        document.getElementById('btn-ready').addEventListener('click', () => {
            this.view.showScreen('game');
            this.view.renderGame(this.game);
        });

        document.getElementById('active-hand').addEventListener('click', (e) => this.handleHandClick(e));
        document.getElementById('active-body').addEventListener('click', (e) => this.handleTargetClick(e, this.game.getActivePlayer()));
        document.getElementById('opponent-body').addEventListener('click', (e) => this.handleTargetClick(e, this.game.getOpponent()));
        document.getElementById('opponent-name').addEventListener('click', (e) => this.handleGlobalTargetClick());
        document.getElementById('btn-discard').addEventListener('click', () => this.handleDiscard());
    }

startGame(mode) {
    this.game = new Game(mode);
    if (mode === 'PVE') this.ai = new AI(this.game);
    this.game.startTurn();
    
    // Para PVP, mostrar primero la pantalla de transición
    if (mode === 'PVP') {
        this.view.elements.transitionTitle.textContent = `Torn de ${this.game.getActivePlayer().name}`;
        this.view.showScreen('transition');
    } else {
        // Para PVE, ir directamente al juego
        this.view.showScreen('game');
        this.view.renderGame(this.game);
    }
}

    handleHandClick(e) {
        const cardEl = e.target.closest('.playable-card');
        if (!cardEl) return;

        document.querySelectorAll('.playable-card').forEach(c => c.classList.remove('selected'));
        cardEl.classList.add('selected');

        const cardId = parseInt(cardEl.dataset.id);
        this.selectedCard = this.game.getActivePlayer().hand.find(c => c.id === cardId);

        this.view.highlightValidTargets(this.game, this.selectedCard);
    }

    handleTargetClick(e, targetPlayer) {
        if (!this.selectedCard) return;

        const isDropZone = e.target.closest('.valid-target');
        if (!isDropZone) return;

        let targetOrganIndex = null;
        const organEl = e.target.closest('.organ-slot');
        if (organEl) targetOrganIndex = parseInt(organEl.dataset.organ);

        this.executeMove(targetPlayer, targetOrganIndex);
    }

    handleGlobalTargetClick() {
        if (!this.selectedCard || !document.getElementById('opponent-name').classList.contains('valid-target')) return;
        this.executeMove(this.game.getOpponent(), null);
    }

    handleDiscard() {
        if (!this.selectedCard) return;
        this.game.discardCard(this.selectedCard);
        this.endTurn();
    }

    executeMove(targetPlayer, targetOrganIndex) {
        if (this.game.isValidMove(this.selectedCard, targetPlayer, targetOrganIndex)) {
            this.game.executeMove(this.selectedCard, targetPlayer, targetOrganIndex);
            this.endTurn();
        }
    }

    endTurn() {
        this.selectedCard = null;
        this.view.clearHighlights();

        if (this.game.checkWin()) {
            this.view.showVictory(this.game.winner.name);
            return;
        }

        this.game.activePlayerIndex = 1 - this.game.activePlayerIndex;
        this.game.startTurn();

        const activePlayer = this.game.getActivePlayer();

        if (activePlayer.isAI) {
            this.view.renderGame(this.game);
            setTimeout(() => {
                this.ai.playTurn();
                if (this.game.checkWin()) {
                    this.view.showVictory(this.game.winner.name);
                    return;
                }
                this.game.activePlayerIndex = 1 - this.game.activePlayerIndex;
                this.game.startTurn();
                this.view.renderGame(this.game);
            }, 1500); // Retard artificial per a que es vegi el torn de la IA
        } else {
            if (this.game.mode === 'PVP') {
                this.view.elements.transitionTitle.textContent = `Torn de ${activePlayer.name}`;
                this.view.showScreen('transition');
            } else {
                this.view.renderGame(this.game);
            }
        }
    }

}
