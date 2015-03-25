module.exports = function(app){ 
	app.get('/home',function(req,res){ 
		if(req.session.user){ 

		}else{ 
			req.session.error  = '请先登录';
			res.render('/login');
		}
	});
};