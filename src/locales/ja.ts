
import type { Locale } from './en';

export const ja: Locale = {
  toast: {
    allyRescued: "仲間を救出！",
    allyRescuedDesc: "仲間の{pieceType}が目を覚ましました！",
    promotion: "昇格！",
    promotionDesc: "あなたのポーンが{pieceType}に昇格しました！",
    chestOpened: "宝箱を開けた！",
    chestOpenedDesc: "あなたの{piece}が{cosmetic}を見つけました！",
    cheatActivated: "チート発動！",
    levelRegenerated: "レベルが{width}x{height}、{factions}つの派閥で再生成されました。",
    levelWon: "このレベルをクリアしました！",
    pieceCreated: "仲間の{pieceType}が現れました。",
    pawnPromoted: "ポーンが{pieceType}に昇格しました。",
    cosmeticAwarded: "あなたの{piece}が{cosmetic}を授与されました。",
    cheatFailed: "チート失敗",
    kingNotFound: "プレイヤーのキングが見つかりません。",
    noEmptySpace: "キングの周りに駒を生成するスペースがありません。",
    noPawnsToPromote: "昇格できるプレイヤーのポーンがいません。",
    noPiecesToDecorate: "コスメティックを授与できるポーン以外の駒がいません。",
  },
  levelCompleteDialog: {
    title: "レベル{level}クリア！",
    description: "おめでとうございます！キングは自動的に引き継がれます。次のレベルに連れて行く駒を最大{maxCarryOver}体まで選択してください。",
    button: "レベル{levelPlus1}を開始（{selected}/{max}選択中）",
  },
  gameOverDialog: {
    title: "ゲームオーバー",
    description: "あなたのキングは倒されました。次の幸運を祈ります！",
    button: "もう一度プレイ",
  },
  howToPlayDialog: {
    title: "Chess Crawlの遊び方",
    description: "ダンジョン探索アドベンチャーのシンプルなガイドです。",
    goalTitle: "目的",
    goalText: "目的はシンプル：生き残り、征服すること。各レベルで、ボード上のすべての敵の駒を倒さなければなりません。あなた自身のキングは生き残らなければなりません。キングが取られたらゲームオーバーです！",
    yourTurnTitle: "あなたのターン",
    yourTurnText: "駒を動かすには、まずあなたの駒（白い駒）のいずれかをクリックします。すると、移動可能なマスがハイライトされます。次に、ハイライトされたマスのいずれかをクリックしてそこに移動します。キングが攻撃されている場合、赤く光ります。キングが危険な状態に留まるような手も赤くハイライトされるので注意してください！",
    boardObjectsTitle: "ボード上のオブジェクト",
    sleepingAlliesTitle: "眠れる仲間",
    sleepingAlliesText: "救出を待っている仲間の駒です！彼らのマスに移動することはできません。彼らを起こすには、あなたの駒のいずれかを彼らの隣接するマスに移動させるだけです。彼らはすぐにあなたのパーティーに加わります。",
    chestsTitle: "宝箱",
    chestsText: "宝箱のマスに移動して開けます。ポーンが宝箱を開けると、より強力な駒に昇格します！他の駒は、サングラスやトップハットのようなクールなコスメティックアイテムを見つけます。",
    wallsTitle: "壁",
    wallsText: "これは通行不可能な石の壁です。どの駒も通り抜けたり、そのマスに移動したりすることはできません。有利に活用しましょう！",
    pieceMovementsTitle: "駒の動き",
    pieceMovementsText: "駒はチェスのように動きますが、ローグライクのひねりが加わっています！",
    kingDesc: "どの方向にも1マス動きます。最も重要な駒です！",
    queenDesc: "どの方向（水平、垂直、または斜め）にも任意の数のマスを動きます。",
    rookDesc: "水平または垂直に任意の数のマスを動きます。",
    bishopDesc: "斜めに任意の数のマスを動きます。",
    knightDesc: "「L」字型に動きます：一方向（水平または垂直）に2マス、そして垂直に1マス。他の駒を飛び越えることができます。",
    pawnDesc: "これは特別です！",
    pawnMove1: "現在の方向に1マス前進します。",
    pawnMove2: "斜め前方にキャプチャします。",
    pawnMove3: "障害物（壁や他の駒など）に隣接している場合、「跳ね返って」それから直接1マス離れた場所に移動できます。",
    pawnMove4: "斜め以外の動きをすると、前進方向がその動きに変わります。",
    closeButton: "わかった！",
  },
  history: {
    allyJoined: "仲間の{pieceType}（{name}）が目を覚まし、あなたのパーティーに加わりました！",
    playerCapture: "あなたの{name}（{piece}）が({x}, {y})で{faction}の{targetPiece}をキャプチャしました。",
    playerPromotion: "{name}（{piece}）が宝箱を開け、{newPieceType}に昇格しました！",
    playerCosmetic: "{name}（{piece}）が宝箱を開け、{cosmetic}を見つけました。",
    playerMove: "あなたの{name}（{piece}）が({x}, {y})に移動しました。",
    enemyMove: "{faction}の{name}（{piece}）が({x}, {y})に移動しました。",
    enemyCapture: "{faction}の{name}（{piece}）が({x}, {y})で別の{targetFaction}の{targetPiece}をキャプチャしました。",
    enemyNoMoves: "{faction}派閥には利用可能な動きがありません。",
    levelStart: "--- レベル{level}開始 ---",
    pieceCarriedOver: "あなたの{name}（{piece}）は前のレベルから引き継がれました。",
    playerPieceCaptured: "あなたの{name}（{piece}）、レベル{discoveredOnLevel}で発見、キャプチャ数{captures}は、{faction}の{enemyPiece}に倒されました。",
    playerPieceCaptured_cosmetic: "あなたの{name}（{piece}）、レベル{discoveredOnLevel}で発見、キャプチャ数{captures}、{cosmetic}を着用中は、{faction}の{enemyPiece}に倒されました。",
  },
  hud: {
    title: "Chess Crawl",
    level: "レベル{level}",
    howToPlay: "遊び方",
    playerTurn: "プレイヤーのターン",
    enemyTurn: "{faction}派閥のターン",
    enemyThinking: "敵は考えています...",
    pieceInfo: {
      pieceType: "駒の種類",
      cosmetic: "コスメティック",
      discovered: "発見場所",
      captures: "キャプチャ数",
      discoveredOn: "レベル{level}",
    },
    inventory: "所持品",
    allies: "仲間：{count}",
    cosmetics: "コスメティック：{count}",
    history: "履歴",
    historyPlaceholder: "レベルの履歴はここに表示されます...",
    cheats: "チート",
    restartGame: "ゲームを再起動",
    cheatsPanel: {
      title: "チートパネル",
      regenerateLevel: "レベルを再生成",
      factions: "派閥：",
      go: "実行",
      createPiece: "駒を作成",
      selectPiece: "駒を選択",
      create: "作成",
      winLevel: "レベルに勝利",
      promotePawn: "ポーンを昇格",
      awardCosmetic: "コスメティックを授与",
      debugLog: "デバッグログ",
      debugPlaceholder: "デバッグ出力はここに表示されます...",
    },
    resetDialog: {
      title: "本当によろしいですか？",
      description: "この操作は元に戻せません。すべての進行状況が失われ、ゲームはレベル1から再開されます。",
      cancel: "キャンセル",
      restart: "再起動",
    },
    language: "言語",
    english: "英語",
    debug: "デバッグ",
    ukrainian: "ウクライナ語",
    japanese: "日本語",
    muteSounds: "ミュート",
    unmuteSounds: "ミュート解除",
  },
  pieces: {
    King: "キング",
    Queen: "クイーン",
    Rook: "ルーク",
    Bishop: "ビショップ",
    Knight: "ナイト",
    Pawn: "ポーン",
    Unnamed: "名無し",
  },
  cosmetics: {
    none: "なし",
    sunglasses: "😎 サングラス",
    tophat: "🎩 トップハット",
    partyhat: "🎉 パーティーハット",
    bowtie: "🎀 蝶ネクタイ",
    heart: "❤️ ハート",
    star: "⭐ 星",
  },
  nameParts: {
    firstNames: [
        '晶', '武', '警', '龍', '英二', '文', '灰', '晴', '仁', '譲',
        '海', '烈', '守', '誠', '琴', '頼', '樹', '修', '匠', '勝',
        '旭', '蒼', '海斗', '大地', '力', '勇', '秀', '藍', '義', '賢',
        '陸', '雅', '聖', '凛', '伶', '創', '空', '辰', '冬'
    ],
    lastNames: [
      '剛心', '鬼斬', '風走', '慧眼', '力王',
      '不動', '深慮', '正道', '無畏', '仁心',
      '光輝', '厳冬', '無音', '丘守', '川主',
      '森人', '山神', '天駆', '星詠', '深淵',
      '鋼心', '影終', '嵐呼', '陽歩', '月詠',
      '石拳', '光導', '虚空', '火種', '冬生'
    ]
  },
};
