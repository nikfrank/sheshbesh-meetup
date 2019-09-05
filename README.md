# sheshbesh computer player meetup

It's 2020! (almost) We want to play sheshbesh against computers!

Let's build the computer player for a sheshbesh game that we found on github

---

### Agenda

- [step 1: Clone the game, plan how our CP will work](#step1)
- [step 2: Writing a scoring function](#step2)
- [step 3: The "algorithm" aka picking the best option, moving the pieces](#step3)
- [step 4: Deploy the solution to Heroku](#step4)


## Getting Started

you'll need a command line with node and git installed. If you don't have it already, ask someone to help you install it

`$ cd ~/code`

`$ git clone https://github.com/nikfrank/sheshbesh-meetup`

`$ cd sheshbesh-meetup`

`$ npm start`

you now have the game running in you browser without a computer player yet...



<a name="step1"></a>
## step 1: Clone the game, plan how our CP will work

When we strt hacking something onto somebody else's code, we should understand a bit how it works first

let's start, as we always do, by reading `./src/App.js`, specifically its `state`


#### board and pieces

<sub>./src/App.js</sub>
```js
//...


import {
  calculateLegalMoves,
  calculateBoardOutcomes,
  calculateBoardAfterMove,
} from './util';

const initBoard = [
  2, 0, 0, 0, 0, -5,
  0, -3, 0, 0, 0, 5,
  -5, 0, 0, 0, 3, 0,
  5, 0, 0, 0, 0, -2,
];


//...
```

we should take a look at those utility functions in a minute,

right now we can take a second to grok how the board is kept track of in an array of (+/-) numbers

5 means 5 black pieces

-2 means 2 white pieces

the black player is moving from low indices (0) to high indices (23), then home

the white player is moving from high indices (23) to low indices (0), then home



```js
//...

class App extends React.Component {

  state = {
    chips: [...initBoard],
    whiteHome: 0,
    whiteJail: 0,
    blackHome: 0,
    blackJail: 0,

    cp: 'white',
    turn: 'black',
    dice: [],
    selectedChip: null,
  }

```

the board is stored in a value in `state` named `chips`, which is the name for the triangles on the board

also we track the jails and homes, whose turn it is, the dice, and if the user has selected a chip which one



#### rendering the pieces, event handling

<sub>./src/App.js</sub>
``html
//...

          <Board chips={this.state.chips}
                 onClick={this.spaceClicked}
                 onDoubleClick={this.spaceDoubleClicked}
                 selectedChip={this.state.selectedChip}
                 whiteJail={this.state.whiteJail} whiteHome={this.state.whiteHome}
                 blackJail={this.state.blackJail} blackHome={this.state.blackHome} />

//...
```


the `Board` component will render the pieces, selectedChip, jails and homes... and it will route click and doubleClick events to our event handler functions


those functions enforce the rules of the game by interpreting user events as causing legal game actions

```js
//...

  spaceClicked = (index)=> {

    //...

    // if no chip selected
    if( this.state.selectedChip === null ){
      //// if click is on turn's chips, select that chip (return)
      if( ((this.state.chips[index] > 0) && (this.state.turn === 'black')) ||
          ((this.state.chips[index] < 0) && (this.state.turn === 'white')) ){
        this.setState({ selectedChip: index });
      }

    } else {
      // else this is a second click
      //// if the space selected is a valid move, this.makeMove(index)
      if( this.state.dice.includes(direction * (index - this.state.selectedChip)) ){
        if( (this.state.chips[index] * direction >= 0) ||
            Math.abs(this.state.chips[index]) === 1 ){
          this.makeMove(index);
        }
      }

      //// if another click on the selectedChip, unselect the chip
      if( index === this.state.selectedChip ){
        this.setState({ selectedChip: null });
      }
    }

    //...
  }


//...
```

here we can see how the user selects a piece, moves the piece or unselects the piece


and next we should look at the `makeMove` function

```js
//...

  makeMove = (to)=> {
    const usedDie = (this.state.selectedChip !== null) ?
                    (this.state.turn === 'white' ? -1 : 1) * (to - this.state.selectedChip) :
                    this.state.turn === 'white' ? 24 - to : to + 1;

    
    this.setState({
      ...calculateBoardAfterMove(this.state, {
        moveFrom: this.state.selectedChip === null ? (this.state.turn + 'Jail') : this.state.selectedChip,
        moveTo: to,
        usedDie
      }),

      selectedChip: null
    }, this.checkTurnOver);    
  }

//...
```

we figure out which die to use, then call a utility function which calculates the outcome of the move the user is making


then we need to check if the turn is over (in the `setState` callback)



and a quick look inside the `Board` component, we'll see quite a few SVG tags which draw the board

and for the chips

<sub>./src/Board.js</sub>
```js
//...

    {
      chips.map((chip, i)=> (
        <g key={i}>
          {[...Array(Math.abs(chip))].map((_, c)=> (
            <circle key={c} cx={centers[i]}
                    cy={ i < 12 ? (
                        60 + (60 - 5*Math.max(0, Math.abs(chip)-6))*c
                    ) : (
                        940 - (60 - 5*Math.max(0, Math.abs(chip)-6))*c
                    ) } r={30}
                    className={chip < 0 ? 'white-chip' : 'black-chip'}/>
          ))}

          <rect x={centers[i] - 50} width={100}
                y={ i < 12 ? 20 : 550 } height={430}
                fill='transparent' stroke='transparent'
                onDoubleClick={()=> onDoubleClick(i)}
                onClick={()=> onClick(i)} />

        </g>
      ))
    }

//...
```

we're doing some hack math to scrunch the pieces when there are too many

then rendering invisible rectangles above each space to collect user click and doubleClick events


### computer player architecture

so how are we going to trigger a computer player playing?

I suppose when the user is done their move (which we'll know in the `checkTurnOver` function), we could trigger computer actions

<sub>./src/App.js</sub>
```js
//...

  checkTurnOver = ()=>{
    if( (this.state.whiteHome === 15 ) || ( this.state.blackHome === 15 )){
      //... handle endgame
      
      return;
    }

    const legalMoves = calculateLegalMoves(
      this.state.chips, this.state.dice, this.state.turn,
      this.state.whiteJail, this.state.blackJail
    );

    if( !legalMoves.length ) setTimeout(()=>
      this.setState({
        turn: ({ black: 'white', white: 'black' })[this.state.turn],
        dice: [],
      }, ()=> {
        if( this.state.turn === this.state.cp ) this.cpRoll();
      }), this.state.dice.length * 1000);

    return legalMoves.length;
  }

//...
```

here we see that if the turn is over, and the next turn is the computer's turn, we call the `cpRoll` function

```js
//...

  cpRoll = ()=> {
    this.setState({
      dice: [ Math.random()*6 +1, Math.random()*6 +1 ].map(Math.floor)
    }, ()=>{
      if( this.state.dice[0] === this.state.dice[1] )
        this.setState({
          dice: [...this.state.dice, ...this.state.dice],
        }, this.cpMove);
      else this.cpMove();
    });
  }

//...
```

just like in the `roll` funciton for the player, we make up two random dice numbers, duplicate them if they're the same

but here, we trigger the `cpMove` function, which is where "building the computer player AI" begins....


we'll need to compute the possible outcomes for all the possible moves the computer will make (though we already have a handy utility function for this...)

then we'll choose the best one!


<a name="step2"></a>
## step 2: The "algorithm"... writing a scoring function

<sub>./src/App.js</sub>
```js
//...

  cpMove = ()=> {
    if( !this.checkTurnOver() ) return;

    // we have Dice
    // we should calculate all possible board outcomes
  }

//...
```

First, we've checked if there are legal moves, so now we should read about our `calculateBoardOutcomes` utility function


<sub>./src/util.js</sub>
```js
export const calculateBoardOutcomes = (chips, dice, turn, blackJail, whiteJail)=>{
  let outcomes = [];

  const firstMoves = calculateLegalMoves(chips, dice, turn, whiteJail, blackJail);

  const board = { chips, dice, turn, blackJail, whiteJail };

  const firstBoards = firstMoves.map(move => ({
    board: calculateBoardAfterMove(board, move),
    moves: [move],
  }));

  //...

    return fourthMoves.map(move => ({
      board: calculateBoardAfterMove(thirdBoard.board, move),
      moves: [...thirdBoard.moves, move],
    }));
  });

  return [...outcomes, ...fourthBoards];
}

//...
```

we see here that by passing in all the values describing the current board, we'll get an array of outcome objects which have a `board` field and `moves` array

let's try calling it and take a look at the outcomes in the console


<sub>./src/App.js
```js
    //... in the cpMove function

    const options = calculateBoardOutcomes(
      this.state.chips, this.state.dice, this.state.turn,
      this.state.blackJail, this.state.whiteJail
    );

    console.log(options);
  }

//...
```

<sub>CONSOLE</sub>
```js

[
  {
    board: {
      dice: [ ],
      chips: [
        2, -1, 0, 0, -1, -4,
        0, -2, 0, 0, 0, 4,
        -5, 0, 0, 0, 2, 2,
        5, 0, 0, 0, 0, -2
      ],
      turn: "white",
      whiteJail: 0,
      blackJail: 0
    },
    moves: [
      {
        moveFrom: 5,
        moveTo: 4,
        usedDie: 1
      },
      {
        moveFrom: 7,
        moveTo: 1,
        usedDie: 6
      }
    ]
  },
  //...
]
```

we see here an example where the computer could move one of its forward pieces 1 space, and another near the front 6

the outcome has a lot of vulnerable pieces left over!... that isn't a very good move, but it's a legal option we'll need to decide about with our scoring function


### the scoring function

let's make a placeholder function which will return a neutral result

- 0 will mean the board is equal for the players
- positive will mean good for black
- negative will mean good for white



<sub>./src/util.js</sub>
```js
export const scoreBoard = (chips, blackJail, whiteJail)=>{
  console.log( chips, blackJail, whiteJail );

  return 0;
};

//...
```

so now we can call the scoring function for every board outcome


<sub>./src/App.js</sub>
```js
//...

import {
  calculateLegalMoves,
  calculateBoardOutcomes,
  calculateBoardAfterMove,
  scoreBoard,
} from './util';

//...
```

we've remembered to import the function

so now we can call it

```js
//...

  cpMove = ()=> {

    //...

    // score the outcome boards

    const scoredOptions = options.map(({ board: { chips, blackJail, whiteJail }, moves })=> ({
      moves,
      score: scoreBoard(chips, blackJail, whiteJail),
    }));

    console.log(scoredOptions);
  }

//...
```

we can see in the console now that all the options get a score of 0


#### evaluating positions

now we should figure out what our priorities are in the game of sheshbesh and assign numerical values to everything we care about

everyone has their own thoughts about what's good or bad, our job here will be to code the most important things


- having pieces home is good
- having pieces in jail is baaaaaaaaaaad
- moving the pieces forward is good (more pips is bad)
- having pieces alone (vulnerable to capture) is bad
- having more blocks (to make blockades) is good
- having pieces in the opponent's home 6 is bad


now in our scoring function, let's compute each of those scenarios


#### having pieces home is good

<sub>./src/util.js</sub>
```js
export const scoreBoard = (board)=>{
  const { chips, blackJail, whiteJail } = board;

  const blackHome = 15 - blackJail - chips.reduce((blacks, chip)=>(
    blacks + (chip > 0 ? chip : 0)
  ), 0);

  const whiteHome = 15 - whiteJail - chips.reduce((whites, chip)=>(
    whites - (chip < 0 ? chip : 0)
  ), 0);

  //...
```

each player has 15 pieces, so we can count the number on the board and in jail to know how many are home


we'll assign 15 points to the player for every piece home (+ for black, - for white)



#### having pieces in jail is baaaaaaaaaaad

we know from the input params how many for each player are in jail

we take away 50 for each piece in jail (- for black, + for white)



#### moving the pieces forward is good (more pips is bad)

<sub>./src/util.js</sub>
```js
  //...

  const blackPips = chips.reduce((pips, chip, i)=>(
    pips + (chip > 0 ? chip * (24-i) + ((24 - i)**2)/24 : 0)
  ), 0);

  const whitePips = chips.reduce((pips, chip, i)=>(
    pips - (chip < 0 ? chip * (i+1) - ((i+1)**2)/24 : 0)
  ), 0);

//...
```

here we're adding up all the spaces left to move, and adding more for further away pieces

(distance left squared / 24 will double the score for a piece all the way at the start, and not punish pieces in the home 6)


pips are bad! we want to have as little distance left as possible (- for black, + for white)




#### having pieces alone (vulnerable to capture) is bad


to compute home many pieces we have vulnerable to capture, we need to know first where the furthest back opponent piece is

<sub>./src/util.js</sub>
```js
  //...
  
  const furthestBlack = chips.reduce((furthest, chip, i)=> (
    (chip > 0) && (i < furthest) ? i : furthest), blackJail ? 0 : 24
  );

  const furthestWhite = chips.reduce((furthest, chip, i)=> (
    (chip < 0) && (i > furthest) ? i : furthest), whiteJail ? 24 : 0
  );

```

then we can count the number of singletons we have in front of an opponent


```js

  const blackVun = chips.filter((chip, i)=> (chip === 1) && (i < furthestWhite)).length;
  const whiteVun = chips.filter((chip, i)=> (chip === -1) && (i > furthestBlack)).length;

  //...
```

if we were really sophisiticated, we could count them differently based on how likely the opponent is to roll a capture

eg if the opponent is in jail, we might not have to care about captures on the next turn


vun (vulnerable) is bad, (- for black, + for white)



#### having more blocks (to make blockades) is good

<sub>./src/util.js</sub>
```js
  //...

  const blackBlocks = chips.filter((chip, i)=> (chip > 1) && (i < furthestWhite)).length;
  const whiteBlocks = chips.filter((chip, i)=> (chip < -1) && (i > furthestBlack)).length;

  //...
```

also we only care about blocks in front of an opponent

this score is good (+ for black, - for white), and will cause our computer player to cluster pieces together (good defense!)




#### having pieces in the opponent's home 6 is bad

we're already punishing pieces for being far away in our pips calculation, however, it might still be worthwhile to punish pieces being on the farthest away space even more

<sub>./src/util.js</sub>
```js
  //...

  const blackShneid = Math.max(0, chips[0]);
  const whiteShneid = -Math.min(0, chips[23]);

  //...
```

pieces on the shneid (having gone nowhere), are bad (- for black, + for white)


#### returning a score

```js
  //...

  return (
    + blackHome * 15
    - whiteHome * 15
    
    - blackPips
    + whitePips
    
    - blackJail * 50
    + whiteJail * 50
    
    - blackVun * 10
    + whiteVun * 10
    
    + blackBlocks * 5
    - whiteBlocks * 5
    
    - blackShneid * 10
    + whiteShneid * 10
  );
};

//...
```

now we can inspect some scores and see that they make a bit of sense!



<a name="step3"></a>
## step 3: Picking the best option, moving the pieces


now that we have scores, let's find the best moves for our turn

<sub>./src/App.js</sub>
```js
//...

  cpMove = ()=> {

    //...
    
    // select the best move combo by score

    let bestMoves;
    if( this.state.cp === 'white' )
      bestMoves = scoredOptions.sort((a, b)=> a.score - b.score)[0].moves;

    else
      bestMoves = scoredOptions.sort((a, b)=> b.score - a.score)[0].moves;

    //...
```

and lastly, we should loop over the moves, waiting a bit for each move

and trigger either

- a move from jail
- a move to home
- some other normal move

by triggering either `makeMove` or `spaceDoubleClicked`


```js

    // setTimeout in a loop to trigger the moves.

    for(let i=0; i<(bestMoves.length); i++){
      setTimeout(()=> {
        if( bestMoves[i].moveFrom === this.state.cp+'Jail' ){
          this.makeMove( bestMoves[i].moveTo );

        } else if( bestMoves[i].moveTo === this.state.cp+'Home' ){
          this.spaceDoubleClicked( bestMoves[i].moveFrom );

        } else {
          this.setState({ selectedChip: bestMoves[i].moveFrom }, ()=> {
            this.makeMove( bestMoves[i].moveTo );
          });
        }
      }, 800 + 900*i);
    }
  }

//...
```




<a name="step4"></a>
## step 4: Deploy the solution to Heroku


`$ git remote remove origin`

`$ git remote add origin MY_URL_FROM_MY_GITHUB`

`$ git commit -am "built a computer player"`

`$ heroku create MY_APP_NAME --buildpack mars/create-react-app`

`$ git push heroku master`


now the app is on the open internet!



This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
