import * as app from "../app.module"
import { SocketService } from "../socket.service"
import { projectId } from "../utils"
import  * as newMacroModal  from "../modals/new-macro.modal"
import  * as editMacroModal  from "../modals/edit-macro.modal"
import  * as alerts  from "../services/alerts"
import  * as csrf  from "../services/csrf"


interface ICreateMacroResult{
  alert: boolean
  message: string
  status: number
  errors: string[]
  macro: any
}

app.controller('macroCtrl', ['$scope','$modal',alerts.serviceName, macroCtrlFunction]);


function macroCtrlFunction(scope, modal, alerts: alerts.IAlertService){


  scope.newMacroModal = function(){
    return newMacroModal.showModal(modal).then(function(form){
      scope.newMacro(form.name, form.description, form.command);
      return form.name = form.description = '';
    });
  };


  scope.macroEditModal = function(macroName){
    const graphModel = scope.graphModel;
    const macro = graphModel.macros[macroName];
    editMacroModal.showModal(modal, macro).then(function(selectedItem){
      switch (selectedItem.result) {
        case "edit":
          scope.$emit("updateMacro", {macroId: macro.id, data:{
            name: selectedItem.form.name,
            description: selectedItem.form.description,
            inputs: macro.inputs,
            outputs: macro.outputs
          }});
          break;
      case "delete":
          scope.$emit("deleteMacro", {id: macro.id});
        break;
      case "view":
        scope.graph.setGraphView(graphModel.macros[macroName].id);
      }
    });
  };

  scope.newMacro = function(name, descr, command){
    const data = {
      name: name,
      description: descr
    }
    const message = {
      data:{
        project: projectId,
        data: data,
        type:'macro'
      },
      command: command,
      _csrf: csrf.CSRF.csrfToken

    }

    

    SocketService.sailsSocket.post<ICreateMacroResult>('/macro/create/', message, function(data){
       console.log(data);
      if(data.alert){
        alerts.addAlert({type:'danger', msg: data.message});
      } else if(data.status == 500 && data.errors){
        data.errors.forEach(function(message){
          alerts.addAlert({type:'danger', msg: message})
        })
      }
      scope.$digest();
      if(data.macro){
        scope.graph.setGraphView(data.macro);
      }
    });

    //graphModel.macros[name] = shellParser.createMacro(name, descr, command);
    //const res$ = [];
    //for (let key in graphModel.macros) {
    //  res$.push(key);
    //}
    //graphModel.macroList = res$;
  };
}

export = {init: function(){}}