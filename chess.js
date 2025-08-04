class Board {
    // create board and place pieces
    constructor(bot = null) {
        this.board = [];
        this.selectedSquare = null;
        this.turn = 'W';
        this.messageElement = document.getElementById('message');
        this.messageElement.innerHTML = '';
        if (!bot) {
        	this.players = [new Player('W', 'human'), new Player('B', 'human')];	
        } else {
        	if (bot.colour === 'W') {
        		this.players = [new Player('W', 'bot'), new Player('B', 'human')];
        	} else {
        		this.players = [new Player('W', 'human'), new Player('B', 'bot')];
        	}
        }
        this.bot = bot;

        this.enPassantSq = null;

        for (let i=0; i < 8; i++) {
            this.board.push([]);
            if (i%2 === 0) {
                for (let j=0; j < 8; j++) {
                    j%2===0 ? this.board[i].push(new Square('W', Board.enc(i, j))) : this.board[i].push(new Square('B', Board.enc(i, j)));
                }
            } else {
                for (let j=0; j < 8; j++) {
                    j%2===0 ? this.board[i].push(new Square('B', Board.enc(i, j))) : this.board[i].push(new Square('W', Board.enc(i, j)));
                }
            }
        }

        for (let i=0; i<8; i++) {
            this.board[6][i].place(new Piece('pawn', 'W'));
            this.board[1][i].place(new Piece('pawn', 'B'));
        }

        this.board[7][0].place(new Piece('rook', 'W'));
        this.board[7][7].place(new Piece('rook', 'W'));
        this.board[0][0].place(new Piece('rook', 'B'));
        this.board[0][7].place(new Piece('rook', 'B'));

        this.board[7][2].place(new Piece('bishop', 'W'));
        this.board[7][5].place(new Piece('bishop', 'W'));
        this.board[0][2].place(new Piece('bishop', 'B'));
        this.board[0][5].place(new Piece('bishop', 'B'));

        this.board[7][3].place(new Piece('queen', 'W'));
        this.board[0][3].place(new Piece('queen', 'B'));

        this.board[7][4].place(new Piece('king', 'W'));
        this.board[0][4].place(new Piece('king', 'B'));

        this.board[7][1].place(new Piece('knight', 'W'));
        this.board[7][6].place(new Piece('knight', 'W'));
        this.board[0][6].place(new Piece('knight', 'B'));
        this.board[0][1].place(new Piece('knight', 'B'));

        if (this.bot && this.turn === this.bot.colour) {
        	this.botMove();
        }
    }

    // convert from coords to algebraic notation and vice versa
    static enc(i, j) {
        const X = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const Y = ['8', '7', '6', '5', '4', '3', '2', '1'];

        return X[j] + Y[i];
    }
    static dec(pos) {
        const X = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const Y = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        return [Y.indexOf(pos[1]), X.indexOf(pos[0])];
    }

    render() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        document.getElementById('turn').innerHTML = this.turn === 'W' ? "White's turn" : "Black's turn"

        for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
                const square = this.board[i][j];
                const squareElement = document.createElement('div');
                square.element = squareElement;
                squareElement.className = `square ${square.colour === 'W' ? 'white' : 'black'}`;
                squareElement.dataset.pos = square.pos;

                document.getElementById('white-score').innerHTML = `White score: ${this.players[0].score}`;
                document.getElementById('black-score').innerHTML = `Black score: ${this.players[1].score}`;
                
                // display the pieces
                if (square.piece) {
                    if (square.piece.type === 'pawn') {
                        if (square.piece.colour === 'W') {
                            squareElement.innerHTML = '<img src="media/pawn_white.png" style="cursor: pointer;">';
                        } else if (square.piece.colour === 'B') {
                            squareElement.innerHTML = '<img src="media/pawn_black.png" style="cursor: pointer;">';
                        }
                    } else if (square.piece.type === 'rook') {
                        if (square.piece.colour === 'W') {
                            squareElement.innerHTML = '<img src="media/rook_white.png" style="cursor: pointer;">';
                        } else if (square.piece.colour === 'B') {
                            squareElement.innerHTML = '<img src="media/rook_black.png" style="cursor: pointer;">';
                        }
                    } else if (square.piece.type === 'bishop') {
                        if (square.piece.colour === 'W') {
                            squareElement.innerHTML = '<img src="media/bishop_white.png" style="cursor: pointer;">';
                        } else if (square.piece.colour === 'B') {
                            squareElement.innerHTML = '<img src="media/bishop_black.png" style="cursor: pointer;">';
                        }
                    } else if (square.piece.type === 'queen') {
                        if (square.piece.colour === 'W') {
                            squareElement.innerHTML = '<img src="media/queen_white.png" style="cursor: pointer;">';
                        } else if (square.piece.colour === 'B') {
                            squareElement.innerHTML = '<img src="media/queen_black.png" style="cursor: pointer;">';
                        }
                    } else if (square.piece.type === 'king') {
                        if (square.piece.colour === 'W') {
                            squareElement.innerHTML = '<img src="media/king_white.png" style="cursor: pointer;">';
                        } else if (square.piece.colour === 'B') {
                            squareElement.innerHTML = '<img src="media/king_black.png" style="cursor: pointer;">';
                        }
                    } else if (square.piece.type === 'knight') {
                    	if (square.piece.colour === 'W') {
                    		squareElement.innerHTML = '<img src="media/knight_white.png" style="cursor: pointer;">';
                    	} else if (square.piece.colour === 'B') {
                    		squareElement.innerHTML = '<img src="media/knight_black.png" style="cursor: pointer;">';
                    	}
                    }
                }

                squareElement.addEventListener('click', () => {
                    this.handleClick(i, j);
                });

                boardElement.appendChild(squareElement);
            }
        }
    }

    handleClick(i, j) {
        const clickedSquare = this.board[i][j];
        const selectedPieceDisplayElement = document.getElementById("selected-piece");
        const moveButton = document.getElementById('move-button');

        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

        if (!this.selectedSquare) {
            if (clickedSquare.piece && clickedSquare.piece.colour === this.turn) {
                this.selectedSquare = clickedSquare;
                selectedPieceDisplayElement.innerHTML = `Piece to move: ${Board.enc(i, j)}`;
                moveButton.innerHTML = '';
                moveButton.onclick = null;

                clickedSquare.element.classList.add('highlight');
            }
        } else {
            // deselct by clicking same square
            if (clickedSquare === this.selectedSquare) {
                this.selectedSquare = null;
                selectedPieceDisplayElement.innerHTML = '';
                moveButton.innerHTML = '';
            } else if (clickedSquare.piece && clickedSquare.piece.colour === this.turn) {
                // select different piece
                this.selectedSquare = clickedSquare;
                selectedPieceDisplayElement.innerHTML = `Piece to move: ${Board.enc(i, j)}`;
                moveButton.innerHTML = '';
                moveButton.onclick = null;

                clickedSquare.element.classList.add('highlight');
            } else {
                // place to move
                moveButton.innerHTML = `Move to: ${Board.enc(i, j)}`;
                // when move button is clicked, do the move if possible
                moveButton.onclick = () => {
                    this.move(this.selectedSquare, clickedSquare);
                    selectedPieceDisplayElement.innerHTML = '';
                    moveButton.innerHTML = '';
                    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
                };

                this.selectedSquare.element.classList.add('highlight');
                clickedSquare.element.classList.add('highlight');
            }
        }
    }

    move(sq1, sq2) {
    	this.messageElement.innerHTML = '';
		const [startRow, startCol] = Board.dec(sq1.pos);
        const [endRow, endCol] = Board.dec(sq2.pos);
    
        if (this.getLegalMoves(sq1).includes(sq2)) {
            if (sq2.piece && sq1.piece.colour !== sq2.piece.colour) {
                this.messageElement.innerHTML = `${sq2.piece.colour === 'W' ? 'White' : 'Black'} ${sq2.piece.type} taken!`;
                if (this.turn === 'W') {
                    this.players[0].takenPieces.push(sq2.piece);
                    this.players[0].updateScore();
                } else {
                    this.players[1].takenPieces.push(sq2.piece);
                    this.players[1].updateScore();
                }
            } else if (this.enPassantSq && (sq1.piece.type === 'pawn' && endRow === this.enPassantSq.row && endCol === this.enPassantSq.col)) {
				const dir = Math.sign(endRow-startRow);
            	let takenSq = this.board[endRow-dir][endCol];
            	if (this.turn == 'W') {
            		this.players[0].takenPieces.push(takenSq.piece);
            		this.players[0].updateScore();
            		this.messageElement.innerHTML = "Black pawn taken!<br>it took fucking ages to code en passant so you're welcome";
            	} else {
            		this.players[1].takenPieces.push(takenSq.piece);
            		this.players[1].updateScore();
            		this.messageElement.innerHTML = "White pawn taken!<br>it took fucking ages to code en passant so you're welcome";
            	}
            	takenSq.remove();
            }

			// en passant stuff
            // if this move was a pawn double move then set the enPassantSq
			if (sq1.piece.type === 'pawn' && Math.abs(endRow-startRow) === 2) {
				this.enPassantSq = {row: (startRow+endRow)/2, col: startCol};
			} else {
				this.enPassantSq = null;
			}

			if (!sq1.piece.hasMoved) {
				sq1.piece.hasMoved = true;
			}
			         	
			// move rook when castling
			if (sq1.piece.type === 'king' && Math.abs(endCol-startCol) === 2) {
				const rookCol = endCol > startCol ? 7 : 0;
				const rookSq = this.board[startRow][rookCol];
				// if king side, else queen side
				if (rookCol === 7) {
					this.board[startRow][5].place(rookSq.piece);
					rookSq.remove();
				} else {
					this.board[startRow][3].place(rookSq.piece);
					rookSq.remove();
				}
				this.messageElement.innerHTML = 'Castled!';	
			}

			// actually move
         	sq2.place(sq1.piece);
            sq1.remove();
         	this.selectedSquare = null;

			// now we go the the next player
            this.turn = this.turn === 'W' ? 'B' : 'W';

			if (this.isKingInCheck(this.turn, this.board)) {
				if (!this.hasAnyLegalMoves(this.turn)) {
					this.messageElement.innerHTML = `Checkmate, ${this.turn === 'W' ? 'Black' : 'White'} wins!`;
				} else {
					this.messageElement.innerHTML = `${this.turn === 'W' ? 'White' : 'Black'} in check!`;
				}
			}
            
            this.render();
            if (this.bot && this.turn === this.bot.colour) {
            	this.botMove();
            }
        } else {
            this.messageElement.innerHTML = 'Illegal move!';
            this.selectedSquare = null;
        }
    }

    botMove() {
    	const colour = this.bot.colour;
    	const moves = this.getAllMoves(colour);
    	// pick a move at random
    	const move = moves[Math.floor(Math.random()*moves.length)];
    	this.move(move[0], move[1]);
    	this.messageElement.innerHTML = `Bot moved from ${move[0].pos} to ${move[1].pos}`;
    	
    }

    isLegalMove(sq1, sq2, boardArray, enPassantSq = null) {
        if (sq2.piece && sq1.piece.colour === sq2.piece.colour) {
            return false;
        } else {
            return sq1.piece.isLegalMove(sq1, sq2, boardArray, enPassantSq);
        }
    }

    isKingInCheck(colour, boardArray) {
    	let kingSq;
    	let enemySqs = [];
    	for (let i=0; i<8; i++) {
    		for (let j=0; j<8; j++) {
    			if (!boardArray[i][j].piece){
    				continue;
    			} else {
    				let piece = boardArray[i][j].piece;
    				if (piece.type === 'king' && piece.colour === colour) {
    					kingSq = boardArray[i][j]; 
    				} else if (piece.colour !== colour) {
    					enemySqs.push(boardArray[i][j]);
    				}
    			}
    		}
    	}
    	for (const sq of enemySqs) {
    		if (this.isLegalMove(sq, kingSq, boardArray, this.enPassantSq)) {
    			return true;
    		}
    	}

    	return false;
    }

    getLegalMoves(sq) {
    	const board = this.board;
    	let moves = [];

    	for (let i=0; i<8; i++) {
    		for (let j=0; j<8; j++) {
    			const targetSq = board[i][j];
    			if (this.isLegalMove(sq, targetSq, board, this.enPassantSq)) {
    				let simulatedBoard = this.simulateMove(sq, targetSq, board);
    				if (!this.isKingInCheck(sq.piece.colour, simulatedBoard)) {
    					moves.push(targetSq);
    				}
    			}
    		}
    	}
    	return moves;
    }

    getAllMoves(colour) {
    	let moves = [];
    	for (const row of this.board) {
    		for (const sq of row) {
    			if (sq.piece && sq.piece.colour === colour) {
    				const legalMoves = this.getLegalMoves(sq);
    				if (legalMoves.length > 0) {
    					for (const move of legalMoves) {
    						moves.push([sq, move]);
    					}
    				}
    			}
    		}
    	}
    	return moves;
    }

    hasAnyLegalMoves(colour) {
    	for (const row of this.board) {
    		for (const sq of row) {
    			if (sq.piece && sq.piece.colour === colour) {
    				if (this.getLegalMoves(sq).length > 0) {
    					return true;
    				}
    			}
    		}
    	}
    	return false;
    }

    simulateMove(sq1, sq2, board) {
		let boardClone = [];
    	for (const row of board) {
    		let newRow = []
    		for (const sq of row) {
    			let newSq = new Square(sq.colour, sq.pos);
    			if (sq.piece){
    				newSq.place(new Piece(sq.piece.type, sq.piece.colour));
    			}
    			newRow.push(newSq);
    		}
    		boardClone.push(newRow);
    	}
    	
    	const [startRow, startCol] = Board.dec(sq1.pos);
    	const [endRow, endCol] = Board.dec(sq2.pos);
		boardClone[endRow][endCol].piece = boardClone[startRow][startCol].piece;
		boardClone[startRow][startCol].remove();

    	return boardClone;
    }

    log() {
        for (let i=0; i < 8; i++) {
            for (let j=0; j < 8; j++) {
                console.log(this.board[i][j]);
            }
            console.log('\n');
        }
    }

    static fromJSON(data) {
    	const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    	const board = Object.create(Board.prototype);
    	board.board = parsed.board.map(row => {
    		return row.map(sq => {
    			const square = new Square(sq.colour, sq.pos);
    			if (sq.piece) {
    				square.piece = new Piece(sq.piece.type, sq.piece.colour);
    				square.piece.hasMoved = sq.piece.hasMoved;
    			}
    			return square;
    		});
    	});
    	board.players = parsed.players.map(p => {
    		const player = new Player(p.colour, p.type);
    		player.takenPieces = p.takenPieces.map(tp => {
    			const piece = new Piece(tp.type, tp.colour);
    			piece.hasMoved = tp.hasMoved;
    			return piece;
    		});
    		player.score = p.score;
    		return player;
    	});
		board.turn = parsed.turn;
		board.enPassantSq = parsed.enPassantSq;
		board.bot = parsed.bot;
		board.messageElement = document.getElementById('message');

		return board;
    }
}

class Square {
    constructor(colour, pos) {
        this.colour = colour;
        this.piece = null;
        this.pos = pos;
    }

    remove() {
        this.piece = null;
    }
    place(piece) {
        this.piece = piece;
    }
}

class Piece {
    constructor(type, colour) {
        this.type = type;
        this.colour = colour;
        this.hasMoved = false;
    }

    isLegalMove(sq1, sq2, board, enPassantSq = null) {
        switch (this.type) {
            case 'pawn':
                return this.isLegalPawnMove(sq1, sq2, board, enPassantSq);
            case 'rook':
                return this.isLegalRookMove(sq1, sq2, board);
            case 'bishop':
                return this.isLegalBishopMove(sq1, sq2, board);
            case 'queen':
                return this.isLegalQueenMove(sq1, sq2, board);
            case 'king':
                return this.isLegalKingMove(sq1, sq2, board);
            case 'knight':
            	return this.isLegalKnightMove(sq1, sq2);
            default:
                return false;
        }
    }
    isLegalPawnMove(sq1, sq2, board, enPassantSq){
        const [startRow, startCol] = Board.dec(sq1.pos);
        const [endRow, endCol] = Board.dec(sq2.pos);
        const direction = this.colour === 'W' ? -1 : 1;

        if (startCol === endCol) {
            if (endRow === startRow + direction && !sq2.piece) {
                return true;
            }

            const firstMove = (startRow === 6 && this.colour === 'W') ||
            (startRow === 1 && this.colour === 'B');
            const midRow = startRow + direction;
            if (firstMove && endRow === startRow + direction*2 && !sq2.piece &&
                !board[midRow][startCol].piece
            ) {
                return true;
            }
        }

        // diagonal taking
        if (Math.abs(endCol - startCol) === 1 &&
        endRow === startRow + direction &&
        sq2.piece && sq2.piece.colour !== this.colour) {
            return true;
        }

        //en passant
        if (enPassantSq && endRow === enPassantSq.row && endCol === enPassantSq.col) {
        	return true;
        }

        return false;
    }
    isLegalRookMove(sq1, sq2, board) {
        const [startRow, startCol] = Board.dec(sq1.pos);
        const [endRow, endCol] = Board.dec(sq2.pos);

        if ((startRow === endRow || startCol === endCol) &&
            !this.isPathBlocked(sq1, sq2, board, 'orthogonal')
        ) {
            return true;
        } else {
            return false;
        }
    }
    isLegalBishopMove(sq1, sq2, board) {
        const [startRow, startCol] = Board.dec(sq1.pos);
        const [endRow, endCol] = Board.dec(sq2.pos);

        if (Math.abs(endRow-startRow) === Math.abs(endCol-startCol) &&
            !this.isPathBlocked(sq1, sq2, board, 'diagonal')
        ) {
            return true;
        } else {
            return false;
        }
    }
    isLegalQueenMove(sq1, sq2, board) {
        return (this.isLegalBishopMove(sq1, sq2, board) || this.isLegalRookMove(sq1, sq2, board));
    }
    isLegalKingMove(sq1, sq2, board) {
        const [startRow, startCol] = Board.dec(sq1.pos);
        const [endRow, endCol] = Board.dec(sq2.pos);

        const rowDif = Math.abs(endRow-startRow);
        const colDif = Math.abs(endCol-startCol);

		// if normal move, else if castling, else invalid
        if (rowDif <= 1 && colDif <= 1) {
            return true;
        } else if (rowDif === 0 && Math.abs(colDif) === 2) {
        	// check if king has moved and if not, check if rooks have moved
        	console.log('castling attempt');
			if (sq1.piece.hasMoved) {
				console.log('failed: king has already moved');
				return false;
			} else {
				// rook shit
				const rookCol = endCol > startCol ? 7 : 0;
				const rookSq = board[startRow][rookCol];
				if (!rookSq.piece || rookSq.piece.hasMoved) {
					console.log('failed: rook has already moved');
					return false;
				}
				// by this point we should have established that the rook and king havent moved
				// now checking if clear path between king and rook
				if (this.isPathBlocked(sq1, rookSq, board, 'orthogonal')) {
					console.log(`failed: path blocked between king at ${sq1.pos} and rook at ${rookSq.pos}`);
					return false;
				}
				// creating a dummy board to access Board methods to see if king would be in check en route
				let dummy = new Board();
				const sqToCheck = board[startRow][rookCol===7 ? startCol+1 : startCol-1];
				dummy.board = dummy.simulateMove(sq1, sqToCheck, board);
				if (dummy.isKingInCheck(sq1.piece.colour, dummy.board)) {
					console.log('failed: king would be in check en route');
					return false;
				} else {
					return true;
				}
			}
        	
        } else {
            return false;
        }
    }
    isLegalKnightMove(sq1, sq2) {
    	const [startRow, startCol] = Board.dec(sq1.pos);
    	const [endRow, endCol] = Board.dec(sq2.pos);

    	const rowDif = Math.abs(endRow-startRow);
    	const colDif = Math.abs(endCol-startCol);

    	if (rowDif === 1 && colDif === 2 ||
    	rowDif === 2 && colDif === 1) {
    		return true;
    	} else {
    		return false;
    	}
    }
    
    isPathBlocked(sq1, sq2, board, mode) {
        const [startRow, startCol] = Board.dec(sq1.pos);
        const [endRow, endCol] = Board.dec(sq2.pos);

        if (mode === 'orthogonal') {
            if (startRow === endRow) {
                const dif = endCol - startCol;
                const direction = Math.sign(dif)
                for (let col=startCol+direction; col!==endCol; col+=direction) {
                    if (board[startRow][col].piece) {
                        return true;
                    }
                }
                return false;
            } else if (startCol === endCol) {
                const dif = endRow - startRow;
                const direction = Math.sign(dif)
                for (let row=startRow+direction; row!==endRow; row+=direction) {
                    if (board[row][startCol].piece) {
                        return true;
                    }
                }
                return false;
            } else {
                throw new Error("Invalid orthogonal path");
            }
        } else if (mode === 'diagonal') {
            const rowDir = Math.sign(endRow-startRow);
            const colDir = Math.sign(endCol-startCol);
            for (let row=startRow+rowDir, col=startCol+colDir; row!==endRow && col!==endCol; row+=rowDir, col+=colDir) {
                if (board[row][col].piece) {
                    return true;
                }
            }
            return false;
        }
    }
}

class Player {
    constructor(colour, type) {
        this.colour = colour;
        this.type = type;
        this.score = 0;
        this.takenPieces = [];
    }
    updateScore() {
        this.score = 0;
        this.takenPieces.forEach((piece) => {
            switch (piece.type) {
                case 'pawn':
                    this.score++;
                    break;
                case 'rook':
                    this.score += 5;
                    break;
                case 'bishop':
                    this.score += 3;
                    break;
                case 'queen':
                    this.score += 9;
                    break;
                case 'knight':
                	this.score += 3;
                	break;
            }
        });
    }
}

function reset() {
    location.reload();
}

function botButton() {
	messageElement.innerHTML = `<button type="button" onClick="board = new Board({colour: 'B'}); board.render()">Play as white</button> <button type="button" onClick="board = new Board({colour: 'W'}); board.render()">Play as black</button>`;
}

function saveBoard(board) {
	localStorage.setItem('savedGame', JSON.stringify(board));
	messageElement.innerHTML = 'Game saved!';
}
function loadBoard() {
	const data = localStorage.getItem('savedGame');
	if (!data) {
		messageElement.innerHTML = 'Error: no saved game to load!';
		return;
	}

	const loaded = Board.fromJSON(data);
	board = loaded;
	board.render();
	messageElement.innerHTML = 'Game loaded!';
}

let board = new Board();

const messageElement = document.getElementById('message');
messageElement.innerHTML = `<button type="button" onclick="board.render(); messageElement.innerHTML = ''">2 player</button> <button type="button" onClick="botButton(board)">Play against computer</button>`;
