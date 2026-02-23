export class View {
    constructor() {
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            transition: document.getElementById('transition-screen'),
            victory: document.getElementById('victory-screen')
        };
        
        this.elements = {
            activeBody: document.getElementById('active-body'),
            activeHand: document.getElementById('active-hand'),
            opponentBody: document.getElementById('opponent-body'),
            opponentHand: document.getElementById('opponent-hand'),
            turnIndicator: document.getElementById('turn-indicator'),
            discardPile: document.getElementById('discard-pile'),
            activeName: document.getElementById('active-name'),
            opponentName: document.getElementById('opponent-name'),
            btnDiscard: document.getElementById('btn-discard'),
            transitionTitle: document.getElementById('transition-title'),
            victoryMessage: document.getElementById('victory-message')
        };
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');
    }

    renderCard(card, isHidden = false) {
        const div = document.createElement('div');
        if (isHidden) {
            div.className = 'card card-back';
            div.textContent = 'VIRUS!';
            return div;
        }
        
        div.className = `card color-${card.color}`;
        div.dataset.id = card.id;
        
        let icon = '';
        if (card.type === 'ORGAN') icon = card.color==='red'?'❤️':card.color==='blue'?'🧠':card.color==='green'?'🍏':'🦴';
        else if (card.type === 'VIRUS') icon = '🦠';
        else if (card.type === 'MEDICINE') icon = '💊';
        else icon = '⚡';

        div.innerHTML = `<div>${icon}</div><div>${card.title}</div>`;
        return div;
    }

    renderOrgan(organ, playerIndex, organIndex) {
        const div = this.renderCard(organ.organCard);
        div.classList.add('organ-slot');
        div.dataset.player = playerIndex;
        div.dataset.organ = organIndex;

        const attachedDiv = document.createElement('div');
        attachedDiv.className = 'attached-cards';
        
        organ.medicines.forEach(() => {
            const m = document.createElement('div'); m.className = 'mini-card mini-med'; m.textContent = '💊'; attachedDiv.appendChild(m);
        });
        organ.viruses.forEach(() => {
            const v = document.createElement('div'); v.className = 'mini-card mini-virus'; v.textContent = '🦠'; attachedDiv.appendChild(v);
        });

        div.appendChild(attachedDiv);
        return div;
    }

    renderGame(game, isTransitioning = false) {
        const active = game.getActivePlayer();
        const opponent = game.getOpponent();

        this.elements.activeName.textContent = active.name;
        this.elements.opponentName.textContent = opponent.name;
        this.elements.turnIndicator.textContent = `Torn de ${active.name}`;

        // Renderitzar cossos
        this.elements.activeBody.innerHTML = '';
        if (active.body.length === 0) this.elements.activeBody.innerHTML = '<div class="card empty-slot" data-player="active">Jugar Òrgan Aquí</div>';
        active.body.forEach((organ, idx) => {
            this.elements.activeBody.appendChild(this.renderOrgan(organ, game.activePlayerIndex, idx));
        });

        this.elements.opponentBody.innerHTML = '';
        opponent.body.forEach((organ, idx) => {
            this.elements.opponentBody.appendChild(this.renderOrgan(organ, 1 - game.activePlayerIndex, idx));
        });

        // Renderitzar mà
        this.elements.activeHand.innerHTML = '';
        active.hand.forEach(card => {
            const cardEl = this.renderCard(card, isTransitioning);
            if (!isTransitioning) cardEl.classList.add('playable-card');
            this.elements.activeHand.appendChild(cardEl);
        });

        this.elements.opponentHand.innerHTML = '';
        opponent.hand.forEach(() => {
            this.elements.opponentHand.appendChild(this.renderCard(null, true));
        });

        // Descart
        this.elements.discardPile.innerHTML = '';
        if (game.discardPile.length > 0) {
            const topDiscard = game.discardPile[game.discardPile.length - 1];
            this.elements.discardPile.appendChild(this.renderCard(topDiscard));
        } else {
            this.elements.discardPile.innerHTML = '<div class="card empty-slot">DESCART</div>';
        }
    }

    highlightValidTargets(game, card) {
        this.clearHighlights();
        const active = game.getActivePlayer();
        const opponent = game.getOpponent();

        if (card.type === 'ORGAN' && !active.hasOrgan(card.color)) {
            const emptySlots = this.elements.activeBody.querySelectorAll('.empty-slot');
            emptySlots.forEach(el => el.classList.add('valid-target'));
        }

        if (card.type === 'MEDICINE') {
            const myOrgans = this.elements.activeBody.querySelectorAll('.organ-slot');
            myOrgans.forEach(el => {
                const idx = el.dataset.organ;
                if (game.isValidMove(card, active, idx)) el.classList.add('valid-target');
            });
        }

        if (card.type === 'VIRUS') {
            const oppOrgans = this.elements.opponentBody.querySelectorAll('.organ-slot');
            oppOrgans.forEach(el => {
                const idx = el.dataset.organ;
                if (game.isValidMove(card, opponent, idx)) el.classList.add('valid-target');
            });
        }

        if (card.type === 'TREATMENT' && (card.title === 'Error Mèdic' || card.title === 'Contagi')) {
            this.elements.opponentName.classList.add('valid-target'); // Clicar el nom rival per aplicar
        }
        
        this.elements.discardPile.classList.add('valid-target');
        this.elements.btnDiscard.classList.remove('hidden');
    }

    clearHighlights() {
        document.querySelectorAll('.valid-target').forEach(el => el.classList.remove('valid-target'));
        this.elements.btnDiscard.classList.add('hidden');
    }

    showVictory(winnerName) {
        this.elements.victoryMessage.textContent = `🎉 ${winnerName} ha guanyat la partida! 🎉`;
        this.showScreen('victory');
    }
}