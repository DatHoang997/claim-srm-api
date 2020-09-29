const {web3ws} = require("./web3")
const global = require("./global")

exports.randomNumber = function (length) {
	var text = "";
	var possible = "123456789";
	for (var i = 0; i < length; i++) {
		var sup = Math.floor(Math.random() * possible.length)
		text += i > 0 && sup == i ? "0" : possible.charAt(sup)
	}
	return Number(text)
}
exports.sleep = async function (time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

exports.getRefBy = async function (username) {
	return global.citizen_contract.methods.citizen(username.toLowerCase()).call()
	.then(function(result){
		return (result.ref_by == "" || result.ref_by == "foundation") ? false : result.ref_by
	})
}

exports.weiToPOC =  function (wei) {
	return decShift(wei, -18);
}

exports.weiToUSDT =  function (wei) {
	return decShift(wei, -6);
}

exports.pocToWei =  function (wei) {
	return decShift(wei, 18);
}

exports.usdtToWei = function (wei) {
	return decShift(wei, 6);
}

function decShift (s, d) {
	if (!s) {
		return "";
	}
	if (s[0] == '-') {
		return '-' + _decShiftPositive(s.substring(1), d);
	}
	return _decShiftPositive(s, d);
}

function intShift(s, d) {
  s = s.toString();
  if (d === 0) {
    return s;
  }
  if (d > 0) {
    return s + '0'.repeat(d);
  } else {
    if (s.length <= d) {
      return 0;
    }
    return s.substring(0, s.length - d);
  }
}

function _decShiftPositive(s, d){
	s = s.toString();
	if (d == 0) {
		return s;
	}
	let f = '';
	let p = s.indexOf('.');
	if (p >= 0) {
		f = s.substring(p+1); // assume that s.length > p
		s = s.substring(0, p);
	}
	if (d > 0) {
		if (d < f.length) {
			s += f.substring(0, d);
			f = f.substring(d+1);
			s = s.replace(/^0+/g, ""); // leading zeros
			if (s.length == 0) {
				s = '0';
			}
			return s + '.' + f;
		}
		s = intShift(s + f, d - f.length);
		s = s.replace(/^0+/g, ""); // leading zeros
		if (s.length == 0) {
			s = '0';
		}
		return s;
	}
	// d < 0
	d = -d
	if (d < s.length) {
		f = s.substring(s.length - d) + f;
		s = s.substring(0, s.length - d);
		f = f.replace(/0+$/g, ""); // trailing zeros
		if (f.length > 0) {
			s += '.' + f;
		}
		return s;
	}
	// d > s.length
	f = '0'.repeat(d - s.length) + s + f;
	f = f.replace(/0+$/g, ""); // trailing zeros
	if (f.length > 0) {
		return '0' + '.' + f;
	}
	return '0';
}
