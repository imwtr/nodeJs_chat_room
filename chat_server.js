var server = require('socket.io')();
var clients = new Array();  // 存储所有客户端 socket 和 name
function getTime(){   // 获取时间格式
	var date = new Date();
	var time = "["+date.getFullYear()+"/"+(date.getMonth()+1)+"/"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+"]";
	return time;
}
function storeContent(_name,_content,_time){       // 保存聊天记录
	var Content = global.dbHandel.getModel('content');  
	Content.create({ 
		name: _name,
		data:_content,
		time:_time
	},function(err,doc){ 
		if(err){ 
			console.log(err);
		}else{ 
			console.log("store content :  success ");
		}
	});
}
				// 获取上线的用户
function getUserUp(ssocket){
var User = global.dbHandel.getModel('user');  
       User.find({status: "up"},function(err,docs){ 
       	if(err){ 
       		console.log(err);
       	}else{ 
       		console.log('users list --default: '+docs);
       		// 因为是回调函数  socket.emit放在这里可以防止  用户更新列表滞后
       		ssocket.broadcast.emit('user_list',docs);   		//更新用户列表
       		ssocket.emit('user_list',docs);   		//更新用户列表
      			
       	}
       });
}

server.on('connection',function(socket){   // server listening
	console.log('socket.id '+socket.id+ ':  connecting');  // console-- message
      getUserUp(socket);	//获取在线用户
      
					// 构造用户对象client
      var client = { 
	Socket: socket,
	name: '----'
      };
      socket.on("message",function(name){ 
      		client.name = name;                    // 接收user name
      		clients.push(client);                     //保存此client
      		console.log("client-name:  "+client.name);
      		socket.broadcast.emit("userIn","system@: 【"+client.name+"】-- a newer ! Let's welcome him ~");
      });
      socket.emit("system","system@:  Welcome ! Now chat with others"); 

	//广播客户传来的数据并处理
	socket.on('say',function(content){         // 群聊阶段
		console.log("server: "+client.name + "  say : " + content);
		//置入数据库
		var time = getTime();
		socket.emit('user_say',client.name,time,content);
		socket.broadcast.emit('user_say',client.name,time,content);
		storeContent(client.name,content,time);   //保存聊天记录
	});

	socket.on("say_private",function(fromuser,touser,content){    //私聊阶段
		var toSocket = "";
		for(var n in clients){ 
			if(clients[n].name === touser){     // get touser -- socket
				toSocket = clients[n].Socket;
			}
		}
		console.log("toSocket:  "+toSocket.id);
		if(toSocket != ""){
		socket.emit("say_private_done",touser,content);   //数据返回给fromuser
		toSocket.emit("sayToYou",fromuser,content);     // 数据返回给 touser
		console.log(fromuser+" 给 "+touser+"发了份私信： "+content);
		}	
	});
function updateInfo(User,oldName,uname,usex){     // 更新用户信息
	User.update({name:oldName},{$set: {name: uname, sex: usex}},function(err,doc){   //更新用户名
				if(err){ 
					console.log(err);
				}else{ 
					for(var n in clients){                       //更新全局数组中client.name 
						if(clients[n].Socket === socket){     // get socket match
							clients[n].name = uname;
						}
					}
					socket.emit("setInfoDone",oldName,uname,usex);   // 向客户端返回信息已更新成功
					socket.broadcast.emit("userChangeInfo",oldName,uname,usex);
		                   console.log("【"+oldName+"】changes name to "+uname);
		                   global.userName = uname;
		                   getUserUp(socket);      // 更新用户列表
				}
			});
}
	socket.on("setInfo",function(oldName,uname,usex){    // 接收客户端 更改信息请求
		console.log(oldName+"  "+uname+"  "+usex);
		// 查看昵称是否冲突并数据更新
	var User =global.dbHandel.getModel('user');
	User.findOne({name:uname},function(err,doc){    // 查看是否冲突
		if(err){ 
			console.log(err);
		}else if(doc){ 
			if(doc.name === oldName){ 
				console.log("用户名没有变化~");
				updateInfo(User,oldName,uname,usex);
			}else{
				console.log("用户名已存在");
				socket.emit("nameExists",uname);
			}
		}else{ 
			updateInfo(User,oldName,uname,usex);
		}
	});
	});


	socket.on("getChatList",function(uname){    //获取客户端用户名并从数据库拉取 聊天记录
		var Content =global.dbHandel.getModel('content');
		Content.find({name: uname},function(err,docs){ 
			if(err){ 
				console.log(err);
			}else{     // 将docs 聊天记录返回给客户端处理
				socket.emit("getChatListDone",docs);
				console.log(uname+"  正在调取聊天记录");
				//console.log(docs);
			}
		});
	});

	socket.on('disconnect',function(){ 	  // Event:  disconnect
		var Name = "";       
		for(var n in clients){                       
			if(clients[n].Socket === socket){     // get socket match
				Name = clients[n].name;
			}
		}
		statusSetDown(Name,socket);         // status  -->  set down
		
		socket.broadcast.emit('userOut',"system@: 【"+client.name+"】 leave ~");
		console.log(client.name + ':   disconnect');

	});
});
function statusSetDown(oName,ssocket){    //注销  下线处理
	var User = global.dbHandel.getModel('user');  
	User.update({name:oName},{$set: {status: 'down'}},function(err,doc){ 
		if(err){ 
			console.log(err);
		}else{ 
			console.log(oName+ "  is  down");
			getUserUp(ssocket);    // 放在内部保证顺序
		}
	});
}
exports.listen = function(charServer){    
	return server.listen(charServer);    // listening 
};