module.exports = { 
	user:{ 
		name:{type:String,required:true},
		password:{type:String,required:true},
		sex:{type:String,default:"boy"},
		status:{type:String,default: "down"}
	},
	content:{ 
		name:{type:String,require:true},
		data:{type:String,require:true},
		time:{type:String,required:true}
	}
};