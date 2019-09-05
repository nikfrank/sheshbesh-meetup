export const calculateBoardOutcomes = (chips, dice, turn, blackJail, whiteJail)=>{
  let outcomes = [];

  const firstMoves = calculateLegalMoves(chips, dice, turn, whiteJail, blackJail);

  const board = { chips, dice, turn, blackJail, whiteJail };

  const firstBoards = firstMoves.map(move => ({
    board: calculateBoardAfterMove(board, move),
    moves: [move],
  }));

  const secondBoards = firstBoards.flatMap(firstBoard=> {
    const { chips, dice, turn, blackJail, whiteJail } = firstBoard.board;
    const secondMoves = calculateLegalMoves(chips, dice, turn, whiteJail, blackJail);

    if( !secondMoves.length ){
      outcomes.push(firstBoard); // one move only
      return [];
    }

    return secondMoves.map(move => ({
      board: calculateBoardAfterMove(firstBoard.board, move),
      moves: [...firstBoard.moves, move],
    }));
  });

  const thirdBoards = secondBoards.flatMap(secondBoard=> {
    const { chips, dice, turn, blackJail, whiteJail } = secondBoard.board;
    const thirdMoves = calculateLegalMoves(chips, dice, turn, whiteJail, blackJail);

    if( !thirdMoves.length ){
      outcomes.push(secondBoard);
      return [];
    };

    return thirdMoves.map(move => ({
      board: calculateBoardAfterMove(secondBoard.board, move),
      moves: [...secondBoard.moves, move],
    }));
  });

  const fourthBoards = thirdBoards.flatMap(thirdBoard=> {
    const { chips, dice, turn, blackJail, whiteJail } = thirdBoard.board;
    const fourthMoves = calculateLegalMoves(chips, dice, turn, whiteJail, blackJail);

    if( !fourthMoves.length ){
      outcomes.push(thirdBoard);
      return [];
    };

    return fourthMoves.map(move => ({
      board: calculateBoardAfterMove(thirdBoard.board, move),
      moves: [...thirdBoard.moves, move],
    }));
  });

  return [...outcomes, ...fourthBoards];
};

export const calculateBoardAfterMove = (board, move)=>{
  const { chips, dice, turn, blackJail, whiteJail } = board;
  const { moveFrom, moveTo, usedDie } = move;

  const direction = turn === 'black' ? 1 : -1;

  let nextDice = [
    ...dice.slice( 0, dice.indexOf(usedDie) ),
    ...dice.slice( dice.indexOf(usedDie) + 1)
  ];

  let nextChips = [...chips];
  let nextWhiteJail = whiteJail;
  let nextBlackJail = blackJail;

  if( typeof moveFrom === 'number' ) nextChips[ moveFrom ] -= direction;
  else {
    if( turn === 'black' ) nextBlackJail--;
    if( turn === 'white' ) nextWhiteJail--;
  }

  // if the to is a single opponent, move it to jail
  if( chips[moveTo] === -direction ){
    nextChips[moveTo] = direction;
    if( turn === 'black' ) nextWhiteJail++;
    if( turn === 'white' ) nextBlackJail++;

  } else {
    // increase a chip in the to
    nextChips[moveTo] += direction;
  }

  return {
    dice: nextDice,
    chips: nextChips,
    turn,
    whiteJail: nextWhiteJail,
    blackJail: nextBlackJail,
  };
};

export const calculateLegalMoves = (chips, dice, turn, whiteJail, blackJail)=>{

  const direction = turn === 'black' ? 1 : -1;

  if( !dice.length ) return [];

  //// if we're in Jail
  ////// calculate spaces in 0-5 or 23-18

  if( (turn === 'white') && (whiteJail > 0) ){
    // check if 23-18 are legal moves by dice
    return dice.filter(die => ( chips[ 24 - die ] <= 1 ))
               .map(die => ({ moveFrom: 'whiteJail', moveTo: 24 - die, usedDie: die }) );

  } else if( (turn === 'black') && (blackJail > 0) ){
    // check if 0-5 are legal moves by dice
    return dice.filter(die => ( chips[ die - 1 ] >= -1 ))
               .map(die => ({ moveFrom: 'blackJail', moveTo: die - 1, usedDie: die }) );

  } else {
    // if all dice we have, for all the chips we have, check if it's open

    let legalMoves = [];

    for(let i = 0; i < chips.length; i++){
      if( chips[i] * direction > 0 ){

        legalMoves = [
          ...legalMoves,
          ...dice.filter(die => (
            (chips[ i + direction * die ] * direction >= -1)
          )).map(die => ({ moveFrom: i, moveTo: i + direction * die, usedDie: die }))
        ];

      }
    }

    let furthestPiece;

    if(turn === 'white'){
      furthestPiece = 24 - chips.reverse().findIndex(chip=> chip * direction > 0);
      chips.reverse();
    } else {
      furthestPiece = 24 - chips.findIndex(chip=> chip * direction > 0);
    }

    const legalHomeMoves = (
      furthestPiece > 6
    ) ? [] : (
      turn === 'white'
    ) ? [0, 1, 2, 3, 4, 5].filter(spot=> (
      (chips[spot] < 0) && (
        (dice.filter(die => die === spot+1).length) ||
        (dice.filter(die => ((die >= furthestPiece) && (spot+1 === furthestPiece))).length)
      )
    )).map(spot => ({
      moveFrom: spot,
      moveTo: 'whiteHome',
      usedDie: dice.find(die => die === spot+1) || Math.max(...dice),
    })

    ) : [23, 22, 21, 20, 19, 18].filter(spot=> (
      (chips[spot] > 0) && (
        (dice.filter(die => die === 24-spot).length) ||
        (dice.filter(die => ((die >= furthestPiece) && (24-spot === furthestPiece))).length)
      )
    )).map(spot => ({
      moveFrom: spot,
      moveTo: 'blackHome',
      usedDie: dice.find(die => die === 24-spot) || Math.max(...dice),
    }));

    let uniqueLegalMoves = [];
    for(let i=0; i<(legalMoves.length); i++){
      if( !uniqueLegalMoves.find(move=> (
        (move.moveTo === legalMoves[i].moveTo) &&
        (move.moveFrom === legalMoves[i].moveFrom)
      )) ) uniqueLegalMoves.push(legalMoves[i]);
    }


    return [
      ...uniqueLegalMoves,
      ...legalHomeMoves,
    ];
  }
};
