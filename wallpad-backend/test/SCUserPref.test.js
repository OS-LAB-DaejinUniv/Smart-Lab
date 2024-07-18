const SCUserPref = await require('./SCUserPref').setTaskList()

console.log(await SCUserPref.taskList);