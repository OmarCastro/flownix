/**
 * Bootstrap
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#documentation
 */

module.exports.bootstrap = function (cb) {
  // It's very important to trigger this callack method when you are finished 
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  // cb();



  // ********************************************
  // Create Dummy User Data
  // ********************************************
  function createDummyUserData(done) {
    var dummyUsers = [
    {
      name: "Administrador el Gran Sheriff",
      email:"admin@admin.pt",
      password: "admin123"
    },
    {
        name: "Omar Castro",
        email:"ei08158@fe.up.pt",
        password: "teste123"  
    }
    ];
    User.count().exec(function(err, count) {
      if (err) return done(err);
      if (count > 0) return done();
      User.create(dummyUsers).exec(done);
    });
  }

  function createDummyProjects(done) {
    var dummyProjects = [
    {
      name:"El miel picante",
      members: [1,2]
    },
    ];

    Project.count().exec(function(err, count) {
      if (err) return done(err);
      if (count > 0) return done();
      Project.create(dummyProjects).exec(function(err,res){
        var len = res.length;
        var current = 0;
        for (var i = len - 1; i >= 0; i--) {
          for(var j = 0, _ref=dummyProjects[i].members, length=_ref.length;j<length;++j){
            var value = _ref[j];
            res[i].members.add(value)
          }
        };
        if (len) {
          res.forEach(function(project){
            if(++current >= len){ done(err,res) }
          });
        } else {
          done(err,res)
        }
      });
    });
  }

  function createDummyGraphs(done) {
    var dummyGraphs = [
      {
        name: null,
        project:1,
        isRoot:true
      },
      {
        name:"macroTest",
        project:1
      }
    ];

    var dummyCommands = ["cat json.txt | grep mimi", "ls | grep c"];

    Graph.count().exec(function(err, count) {
      if (err) return done(err);
      if (count > 0) return done();
      Graph.create(dummyGraphs).exec(function(err, res){
        if (err) return done(err);
        if (!res) return done();
        for (var i = Math.min(res.length, dummyCommands.length)  - 1; i >= 0; i--) {
          GraphGeneratorService.addToGraph(res[i].id,dummyCommands[i]);
        };
        done(err, res);
      });
    });
  }

  async.series([
    createDummyUserData,
    createDummyProjects,
    createDummyGraphs
  ],cb)

};// */