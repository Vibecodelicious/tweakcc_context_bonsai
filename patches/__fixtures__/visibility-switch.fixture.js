function one(X){switch(X.type){case"system":return false;default:return true}}
function two(X){switch(X.type){case"user":case"assistant":return X.message&&X.message.content;case"tool_use":return true;default:return false}}
function three(X){switch(X.type){case"assistant":return true;default:return false}}
