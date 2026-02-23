export class Card {
    constructor(id, type, color, title) {
        this.id = id;
        this.type = type; // 'ORGAN', 'VIRUS', 'MEDICINE', 'TREATMENT'
        this.color = color; // 'red', 'blue', 'green', 'yellow', 'none'
        this.title = title;
    }
}

export class Player {
    constructor(id, name, isAI = false) {
        this.id = id;
        this.name = name;
        this.isAI = isAI;
        this.hand = [];
        this.body = []; // Array d'objectes: { color, organCard, viruses: [], medicines: [] }
    }
    
    hasOrgan(color) {
        return this.body.some(o => o.color === color);
    }
}

export class Game {
    constructor(mode) {
        this.mode = mode;
        this.players = [
            new Player(0, 'Jugador 1', false),
            new Player(1, mode === 'PVE' ? 'Màquina' : 'Jugador 2', mode === 'PVE')
        ];
        this.deck = this.createDeck();
        this.discardPile = [];
        this.activePlayerIndex = 0;
        this.winner = null;
        
        this.shuffleDeck();
        this.dealInitialCards();
    }

    createDeck() {
        let deck = [];
        let id = 0;
        const colors = ['red', 'blue', 'green', 'yellow'];
        
        colors.forEach(color => {
            for(let i=0; i<5; i++) deck.push(new Card(id++, 'ORGAN', color, 'Òrgan'));
            for(let i=0; i<4; i++) deck.push(new Card(id++, 'VIRUS', color, 'Virus'));
            for(let i=0; i<4; i++) deck.push(new Card(id++, 'MEDICINE', color, 'Medicina'));
        });
        
        for(let i=0; i<2; i++) {
            deck.push(new Card(id++, 'TREATMENT', 'none', 'Error Mèdic'));
            deck.push(new Card(id++, 'TREATMENT', 'none', 'Contagi'));
            deck.push(new Card(id++, 'TREATMENT', 'none', 'Trasplantament'));
        }
        return deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealInitialCards() {
        this.players.forEach(p => {
            for(let i=0; i<3; i++) p.hand.push(this.drawCard());
        });
    }

    drawCard() {
        if (this.deck.length === 0) {
            if (this.discardPile.length === 0) return null;
            this.deck = this.discardPile.splice(0, this.discardPile.length);
            this.shuffleDeck();
        }
        return this.deck.pop();
    }

    startTurn() {
        const p = this.players[this.activePlayerIndex];
        const drawn = this.drawCard();
        if (drawn) p.hand.push(drawn);
    }

    getActivePlayer() { return this.players[this.activePlayerIndex]; }
    getOpponent() { return this.players[1 - this.activePlayerIndex]; }

    checkWin() {
        for (let p of this.players) {
            const healthy = p.body.filter(o => o.viruses.length === 0);
            const uniqueColors = new Set(healthy.map(o => o.color));
            if (uniqueColors.size >= 4) {
                this.winner = p;
                return true;
            }
        }
        return false;
    }

    isValidMove(card, targetPlayer, targetOrganIndex) {
        const active = this.getActivePlayer();
        const opponent = this.getOpponent();

        if (card.type === 'ORGAN') {
            return targetPlayer === active && !active.hasOrgan(card.color) && targetOrganIndex === null;
        }
        
        if (targetOrganIndex === null && card.type !== 'TREATMENT') return false;
        
        const organ = targetPlayer.body[targetOrganIndex];
        if (card.type === 'VIRUS') {
            if (targetPlayer === active || organ.color !== card.color) return false;
            return organ.medicines.length < 2; // No immune
        }
        
        if (card.type === 'MEDICINE') {
            if (targetPlayer !== active || organ.color !== card.color) return false;
            if (organ.viruses.length > 0) return true; // Curar
            return organ.medicines.length < 2; // Vacunar/Immunitzar
        }
        
        if (card.type === 'TREATMENT') {
            if (card.title === 'Error Mèdic' || card.title === 'Contagi') {
                return targetPlayer === opponent && targetOrganIndex === null; // Targeteja jugador rival general
            }
            if (card.title === 'Trasplantament') {
                // Requereix lògica especial al controlador (2 targets). Validació simple:
                return true; 
            }
        }
        return false;
    }

    executeMove(card, targetPlayer, targetOrganIndex) {
        const active = this.getActivePlayer();
        
        // Treure la carta de la mà
        active.hand = active.hand.filter(c => c.id !== card.id);

        if (card.type === 'ORGAN') {
            active.body.push({ color: card.color, organCard: card, viruses: [], medicines: [] });
        } 
        else if (card.type === 'VIRUS') {
            const organ = targetPlayer.body[targetOrganIndex];
            if (organ.medicines.length === 1) {
                // Virus destrueix medicina (es descarten totes dues)
                this.discardPile.push(card, organ.medicines.pop());
            } else if (organ.viruses.length === 1) {
                // 2n Virus destrueix l'òrgan
                this.discardPile.push(card, ...organ.viruses, organ.organCard);
                targetPlayer.body.splice(targetOrganIndex, 1);
            } else {
                organ.viruses.push(card);
            }
        }
        else if (card.type === 'MEDICINE') {
            const organ = targetPlayer.body[targetOrganIndex];
            if (organ.viruses.length === 1) {
                // Medicina cura virus (es descarten)
                this.discardPile.push(card, organ.viruses.pop());
            } else {
                organ.medicines.push(card);
            }
        }
        else if (card.type === 'TREATMENT') {
            if (card.title === 'Error Mèdic') {
                const opponent = this.getOpponent();
                const temp = active.body;
                active.body = opponent.body;
                opponent.body = temp;
                this.discardPile.push(card);
            }
            else if (card.title === 'Contagi') {
                const opponent = this.getOpponent();
                active.body.forEach(myOrgan => {
                    if (myOrgan.viruses.length > 0) {
                        const oppOrgan = opponent.body.find(o => o.color === myOrgan.color && o.medicines.length < 2);
                        if (oppOrgan) {
                            const virus = myOrgan.viruses.pop();
                            if (oppOrgan.medicines.length === 1) {
                                this.discardPile.push(virus, oppOrgan.medicines.pop());
                            } else if (oppOrgan.viruses.length === 1) {
                                this.discardPile.push(virus, ...oppOrgan.viruses, oppOrgan.organCard);
                                opponent.body = opponent.body.filter(o => o !== oppOrgan);
                            } else {
                                oppOrgan.viruses.push(virus);
                            }
                        }
                    }
                });
                this.discardPile.push(card);
            }
        }
    }

    discardCard(card) {
        const active = this.getActivePlayer();
        active.hand = active.hand.filter(c => c.id !== card.id);
        this.discardPile.push(card);
    }
}