let hashColor = {};
hashColor.hashCode = function(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

hashColor.intToRGB = function(i) {
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

hashColor.inverseRGB = function(color) {
  return (parseInt(color, 16) ^ 0xFFFFFF | 0x1000000).toString(16).substring(1);
}

hashColor.getColor = function(str) {
  let hashCodeFromString = hashColor.hashCode(str);
  let colorFont = hashColor.intToRGB(hashCodeFromString);
  let colorBackground = hashColor.inverseRGB(colorFont);
  return {colorFont, colorBackground};
}
//console.log('!!!!!!!!!!!!!!!!!!! = SCRIPT!!!!!!!!!!!!!!!');
//module.exports.hashColor = {hashCode, intToRGB, inverseRGB};
