import * as React from "react";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import commonServices from "../Common/CommonServices";
import * as stringsConstants from "../constants/strings";
import styles from "../scss/TOTCreateTournament.module.scss";
import * as LocaleStrings from 'ClbHomeWebPartStrings';

//React Boot Strap
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

//FluentUI controls
import { TextField } from "@fluentui/react/lib/TextField";
import { PrimaryButton } from "@fluentui/react/lib/Button";
import { Label } from "@fluentui/react/lib/Label";
import { Icon } from '@fluentui/react/lib/Icon';
import { DirectionalHint, ITooltipProps, TooltipHost } from '@fluentui/react/lib/Tooltip';

//PNP
import {
  TreeView,
  ITreeItem,
  TreeViewSelectionMode,
} from "@pnp/spfx-controls-react/lib/TreeView";

import * as XLSX from "xlsx";
import { Spinner, SpinnerSize } from "@fluentui/react";

export interface ICreateTournamentProps {
  context?: WebPartContext;
  siteUrl: string;
  onClickCancel: Function;
}

interface ICreateTournamentState {
  actionsList: ITreeItem[];
  tournamentName: string;
  tournamentDescription: string;
  selectedActionsList: ITreeItem[];
  tournamentError: Boolean;
  actionsError: Boolean;
  showForm: Boolean;
  showSuccess: Boolean;
  showError: Boolean;
  errorMessage: string;
  singleTournament: boolean;
  multipleTournament: boolean;
  multipleTrnmtFileName: string;
  importLogs: any;
  disableCreateTournaments: boolean;
  importError: string;
  disableForm: boolean;
  workBook: XLSX.WorkBook;
  totalSheets: string[];
}

//global variables
let commonServiceManager: commonServices;


export default class TOTCreateTournament extends React.Component<
  ICreateTournamentProps,
  ICreateTournamentState
> {
  public createTrmtTreeViewRef: React.RefObject<HTMLDivElement>;
  public createTrmtFileSelectRef: React.RefObject<HTMLInputElement>;
  constructor(props: ICreateTournamentProps, state: ICreateTournamentState) {
    super(props);
    //Set default values for state
    this.createTrmtTreeViewRef = React.createRef();
    this.createTrmtFileSelectRef = React.createRef();
    this.state = {
      actionsList: [],
      tournamentName: "",
      tournamentDescription: "",
      selectedActionsList: [],
      tournamentError: false,
      actionsError: false,
      showForm: true,
      showSuccess: false,
      showError: false,
      errorMessage: "",
      singleTournament: true,
      multipleTournament: false,
      multipleTrnmtFileName: "",
      importLogs: [],
      disableCreateTournaments: true,
      importError: "",
      disableForm: false,
      workBook: XLSX.utils.book_new(),
      totalSheets: []
    };

    //Create object for CommonServices class
    commonServiceManager = new commonServices(
      this.props.context,
      this.props.siteUrl
    );

    //Bind Methods
    this.getActions = this.getActions.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.onActionSelected = this.onActionSelected.bind(this);
    this.saveTournament = this.saveTournament.bind(this);
    this.onFileSelect = this.onFileSelect.bind(this);
    this.onFileDeselect = this.onFileDeselect.bind(this);
    this.importTournament = this.importTournament.bind(this);
  }

  //Get Actions from Master list and bind it to treeview on app load
  public componentDidMount() {
    //Get Actions from Master list and bind it to Treeview
    this.getActions();
  }

  public componentDidUpdate(prevProps: Readonly<ICreateTournamentProps>, prevState: Readonly<ICreateTournamentState>, snapshot?: any): void {

    //Update aria-label attribute to all Create Tournament Treeview's Checkbox inputs
    if (prevState.actionsList.length !== this.state.actionsList.length) {
      const checkboxes = this.createTrmtTreeViewRef.current?.getElementsByTagName('input');
      for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].setAttribute("aria-label", checkboxes[i].getAttribute('id'));
      }
    }
  }

  //Get Actions from Master list and bind it to Treeview
  private async getActions() {
    console.log(stringsConstants.TotLog + "Getting actions from master list.");
    try {
      //Get all actions from 'Actions List'  to bind it to Treeview
      const allActionsArray: any[] = await commonServiceManager.getAllListItems(
        stringsConstants.ActionsMasterList
      );
      var treeItemsArray: ITreeItem[] = [];

      //Loop through all actions and build parent nodes(Categories) for Treeview
      await allActionsArray.forEach((vAction) => {
        const tree: ITreeItem = {
          key: vAction["Category"],
          label: vAction["Category"],
          children: [],
        };
        //Check if Category is already added to the Treeview. If yes, skip adding.
        var found = treeItemsArray.some((value) => {
          return value.label === vAction["Category"];
        });

        //Add category to Treeview only if it doesnt exists already.
        if (!found) treeItemsArray.push(tree);
      });

      //Loop through all actions and build child nodes(Actions) to the Treeview
      await allActionsArray.forEach((vAction) => {
        const tree: ITreeItem = {
          key: vAction.Id,
          label: vAction["Title"],
          data:
            vAction["Category"] +
            stringsConstants.StringSeperator +
            vAction["HelpURL"],
          subLabel:
            vAction["Points"] +
            stringsConstants.PointsDisplayString +
            vAction["Description"],
        };
        var treeCol: Array<ITreeItem> = treeItemsArray.filter((value) => {
          return value.label == vAction["Category"];
        });
        if (treeCol.length != 0) {
          treeCol[0].children.push(tree);
        }
      });
      this.setState({ actionsList: treeItemsArray });
    } catch (error) {
      console.error("TOT_TOTCreateTournament_getActions \n", error);
      this.setState({
        showError: true,
        errorMessage:
          stringsConstants.TOTErrorMessage +
          " while retrieving actions list. Below are the details: \n" +
          JSON.stringify(error),
      });
    }
  }

  //Handle state values for form fields
  private handleInput(event: any, key: string) {
    switch (key) {
      case "tournamentName":
        this.setState({ tournamentName: event.target.value });
        break;
      case "tournamentDescription":
        this.setState({ tournamentDescription: event.target.value });
        break;
      default:
        break;
    }
  }

  //On select of a tree node change the state of selected actions
  private onActionSelected(items: ITreeItem[]) {
    this.setState({ selectedActionsList: items });
  }

  //Validate fields on the form and set a flag
  private ValidateFields(): Boolean {
    let validateFlag: Boolean = true;
    try {
      //clear previous error messages on the form
      this.setState({ showError: false });
      if (this.state.tournamentName == "") {
        validateFlag = false;
        this.setState({ tournamentError: true });
      } else this.setState({ tournamentError: false });
      if (this.state.selectedActionsList.length == 0) {
        validateFlag = false;
        this.setState({ actionsError: true });
      } else this.setState({ actionsError: false });
    } catch (error) {
      console.error("TOT_TOTCreateTournament_validateFields \n", error);
      this.setState({
        showError: true,
        errorMessage:
          stringsConstants.TOTErrorMessage +
          "while validating the form. Below are the details: \n" +
          JSON.stringify(error),
      });
    }
    return validateFlag;
  }

  // Save Tournament Details to SP Lists 'Tournaments' and 'Tournament Actions'
  private async saveTournament() {
    try {
      console.log(stringsConstants.TotLog + "saving tournament details.");
      let filter: string = "Title eq '" + this.state.tournamentName.trim().replace(/'/g, "''") + "'";
      if (this.ValidateFields()) {

        const allItems: any[] =
          await commonServiceManager.getItemsWithOnlyFilter(
            stringsConstants.TournamentsMasterList,
            filter
          );
        if (allItems.length == 0) {
          let submitTournamentsObject: any = {
            Title: this.state.tournamentName.trim(),
            Description: this.state.tournamentDescription,
            Status: stringsConstants.TournamentStatusNotStarted,
          };

          //Create item in 'Tournaments' list
          await commonServiceManager
            .createListItem(
              stringsConstants.TournamentsMasterList,
              submitTournamentsObject
            )
            .then((response) => {
              var selectedTreeArray: ITreeItem[] =
                this.state.selectedActionsList;
              //Loop through actions selected and create a list item for each treeview selection
              selectedTreeArray.forEach((c) => {
                //Skip parent node for treeview which is not an action
                if (c.data != undefined) {
                  let submitObject: any = {
                    Title: this.state.tournamentName.trim(),
                    Action: c.label,
                    Category: c.data.split(stringsConstants.StringSeperator)[0],
                    HelpURL: c.data.split(stringsConstants.StringSeperator)[1],
                    Points: c.subLabel
                      .split(stringsConstants.StringSeperatorPoints)[0]
                      .replace(stringsConstants.PointsReplaceString, ""),
                    Description: c.subLabel
                      .split(stringsConstants.StringSeperatorPoints)[1]
                      .replace(stringsConstants.PointsReplaceString, ""),
                  };

                  //Create an item in 'Tournament Actions' list for each selected action in tree view
                  commonServiceManager
                    .createListItem(
                      stringsConstants.TournamentActionsMasterList,
                      submitObject
                    )
                    .then((responseObj) => { })
                    .catch((error) => {
                      //Log error to console and display on the form
                      console.error(
                        "TOT_TOTCreateTournament_saveTournament \n",
                        JSON.stringify(error)
                      );
                      this.setState({
                        showError: true,
                        errorMessage:
                          stringsConstants.TOTErrorMessage +
                          "while saving the tournament action details to list. Below are the details: \n" +
                          JSON.stringify(error),
                        showForm: true,
                        showSuccess: false,
                      });
                    });
                }
              });
              this.setState({ showForm: false, showSuccess: true });
            })
            .catch((error) => {
              //Log error to console and display on the form
              console.error(
                "TOT_TOTCreateTournament_saveTournament \n",
                JSON.stringify(error)
              );
              this.setState({
                showError: true,
                errorMessage:
                  stringsConstants.TOTErrorMessage +
                  "while saving the tournament details to list. Below are the details: \n" +
                  JSON.stringify(error),
              });
            });
        } else {
          this.setState({
            showError: true,
            errorMessage:
              LocaleStrings.DuplicateTournamentNameError,
          });
        }
      }
    } catch (error) {
      console.error("TOT_TOTCreateTournament_saveTournament \n", error);
      this.setState({
        showError: true,
        errorMessage:
          stringsConstants.TOTErrorMessage +
          "while saving the tournament. Below are the details: \n" +
          JSON.stringify(error),
      });
    }
  }

  //Select and Read Multiple Tournament XLSX File 
  public onFileSelect = async (event: any) => {

    //Reset state variables
    this.setState({
      multipleTrnmtFileName: "",
      importLogs: [],
      disableCreateTournaments: true,
      importError: ""
    });

    // Get the selected file
    const [file] = event.target.files;
    // Get the file name and size
    const { name: fileName, size } = file;
    // Convert size in bytes to kilo bytes
    const fileSize = (size / 1000).toFixed(2);
    // Set the text content
    const fileNameAndSize = `${fileName} - ${fileSize}KB`;

    this.setState({ multipleTrnmtFileName: fileNameAndSize });

    const excelData = await file.arrayBuffer();
    //Reading data from excel
    const workBook = XLSX.read(excelData);
    const totalSheets = workBook.SheetNames;

    this.setState({
      workBook: workBook,
      totalSheets: totalSheets
    });

    if (totalSheets.length > stringsConstants.ImportTournamentLimit) {
      this.setState({
        importError: "The attached file has more than " + stringsConstants.ImportTournamentLimit + " tournaments. Only " + stringsConstants.ImportTournamentLimit + " tournaments can be created at a time. Please correct the file and re-upload."
      });
    }
    else {
      this.setState({
        disableCreateTournaments: false
      });
    }
  }

  //Remove file from the Input control
  public onFileDeselect = () => {

    this.createTrmtFileSelectRef.current.value = null;
    //Reset State variables
    this.setState({
      multipleTrnmtFileName: "",
      disableCreateTournaments: true,
      importLogs: [],
      importError: ""
    });
  }

  //Import tournaments from the excel template into SharePoint lists
  private async importTournament() {
    let sheetName: string;
    try {
      //Disable buttons in the screen
      this.setState({
        disableCreateTournaments: true,
        disableForm: true
      });

      //Read sheets from workbook and import the data into SharePoint
      for (let sheetCount = 0; sheetCount < this.state.totalSheets.length; sheetCount++) {
        sheetName = this.state.workBook.SheetNames[sheetCount];
        const workSheet = this.state.workBook.Sheets[sheetName];
        //Convert array to json
        const sheetRows = XLSX.utils.sheet_to_json(workSheet, { header: 1, defval: null, blankrows: false });

        let tournamentActions: any = [];
        let actionsData: any = [];
        let multipleTournamentNames: string = "";
        let isErrorOccurred: boolean = false;

        if (sheetRows.length > 1) {
          //Check for multiple tournament names in Tournament Name column
          for (let row = 2; row < sheetRows.length; row++) {
            let tournament = sheetRows[row][0];
            if (tournament != null) {
              multipleTournamentNames = tournament.trim();
              if (multipleTournamentNames != "")
                break;
            }
          }
          if (multipleTournamentNames == "") {
            //Validate headers
            let headerArray = [sheetRows[0][0], sheetRows[0][1], sheetRows[0][2], sheetRows[0][3], sheetRows[0][4], sheetRows[0][5], sheetRows[0][6]];

            if (headerArray[0] != undefined && headerArray[0].includes(stringsConstants.TournamentNameHeader) &&
              headerArray[1] != undefined && headerArray[1].includes(stringsConstants.DescriptionHeader) &&
              headerArray[2] != undefined && headerArray[2].includes(stringsConstants.CategoryHeader) &&
              headerArray[3] != undefined && headerArray[3].includes(stringsConstants.ActionHeader) &&
              headerArray[4] != undefined && headerArray[4].includes(stringsConstants.ActionDescriptionHeader) &&
              headerArray[5] != undefined && headerArray[5].includes(stringsConstants.PointsHeader) &&
              headerArray[6] != undefined && headerArray[6].includes(stringsConstants.HelpURLHeader)) {

              //Process data, if sheet is not blank
              let tournamentName = sheetRows[1][0];
              if (tournamentName != null) {
                for (let rowCount = 1; rowCount < sheetRows.length; rowCount++) {

                  if (rowCount == 1) {
                    //Validate and create Tournament in Tournaments List
                    let filter: string = "Title eq '" + tournamentName.trim().replace(/'/g, "''") + "'";
                    const tournamentsItem: any[] = await commonServiceManager.getItemsWithOnlyFilter(
                      stringsConstants.TournamentsMasterList, filter);

                    if (tournamentsItem.length == 0) {
                      let submitTournamentsObject: any = {
                        Title: tournamentName.trim(),
                        Description: sheetRows[1][1],
                        Status: stringsConstants.TournamentStatusNotStarted,
                      };
                      //Create item in 'Tournaments' list
                      await commonServiceManager
                        .createListItem(
                          stringsConstants.TournamentsMasterList,
                          submitTournamentsObject
                        ).then(() => { })
                        .catch((error) => {
                          isErrorOccurred = true;
                          this.setState({
                            importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.ErrorMsgTournamentList)
                          });
                        });
                      if (isErrorOccurred)
                        break;
                    } else {
                      //If tournament already exists in Tournaments List
                      this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.LogMsgTournamentExists + " '" + tournamentName + "' " + LocaleStrings.LogMsgTournamentExists1) });
                      break;
                    }
                  }

                  let category = sheetRows[rowCount][2];
                  let action = sheetRows[rowCount][3];
                  let actionDescription = sheetRows[rowCount][4];
                  let points = sheetRows[rowCount][5];
                  let helpUrl = sheetRows[rowCount][6];

                  if (category != null && action != null && actionDescription != null &&
                    points != null) {

                    actionsData.push({
                      category: category,
                      action: action,
                      actionDescription: actionDescription,
                      points: points,
                      helpUrl: helpUrl,
                    });

                    tournamentActions.push({
                      name: tournamentName,
                      category: category,
                      action: action,
                      actionDescription: actionDescription,
                      points: points,
                      helpUrl: helpUrl,
                    });
                  }
                } //End of For loop rowCount

                //Importing data into Actions List
                if (actionsData.length > 0) {
                  let responseStatus: boolean = true;
                  for (let itemCount = 0; itemCount < actionsData.length; itemCount++) {
                    await commonServiceManager.getAllListItems(
                      stringsConstants.ActionsMasterList).then(async (allActionsItems) => {
                        //If Actions list is not empty
                        if (allActionsItems.length > 0) {
                          const actionExists = allActionsItems.filter((action) =>
                            action.Category.trim().replaceAll(" ", "") === actionsData[itemCount].category.trim().replaceAll(" ", "") &&
                            action.Title.trim().replaceAll(" ", "") === actionsData[itemCount].action.trim().replaceAll(" ", ""));

                          if (actionExists.length == 0) {
                            const categoryExists = allActionsItems.filter((action) =>
                              action.Category.trim().replaceAll(" ", "") === actionsData[itemCount].category.trim().replaceAll(" ", ""));

                            if (categoryExists.length > 0) {
                              actionsData[itemCount].category = categoryExists[0].Category;
                            }
                            responseStatus = await this.createActions(actionsData[itemCount], sheetName);
                          }
                        }
                        else {
                          //If Actions list is empty                     
                          responseStatus = await this.createActions(actionsData[itemCount], sheetName);
                        }
                      });
                    if (!responseStatus) {
                      isErrorOccurred = true;
                      break;
                    }
                  } //End of for loop
                }

                //Importing data into Tournament Actions List
                if (tournamentActions.length > 0 && !isErrorOccurred) {

                  let responseStatus: boolean = true;
                  const allActionsItems: any[] = await commonServiceManager.getAllListItems(stringsConstants.ActionsMasterList);

                  let filter: string = "Title eq '" + tournamentName.trim().replace(/'/g, "''") + "'";

                  await commonServiceManager.getItemsWithOnlyFilter(
                    stringsConstants.TournamentActionsMasterList, filter).then(async (tournamentActionsItem) => {
                      if (tournamentActionsItem.length > 0) {
                        //If any item exists already for the tournament in the Tournament Actions list.
                        for (let itemCount = 0; itemCount < tournamentActions.length; itemCount++) {
                          const tournamentActionExists = tournamentActionsItem.filter((tAction) => tAction.Title.trim() === tournamentActions[itemCount].name.trim() &&
                            tAction.Category.trim().replaceAll(" ", "") === tournamentActions[itemCount].category.trim().replaceAll(" ", "") &&
                            tAction.Action.trim().replaceAll(" ", "") === tournamentActions[itemCount].action.trim().replaceAll(" ", ""));

                          if (tournamentActionExists.length == 0) {
                            const categoryExists = allActionsItems.filter((action) =>
                              action.Category.trim().replaceAll(" ", "") === tournamentActions[itemCount].category.trim().replaceAll(" ", ""));

                            if (categoryExists.length > 0) {
                              tournamentActions[itemCount].category = categoryExists[0].Category;
                            }
                            responseStatus = await this.createTournamentActions(tournamentActions[itemCount], sheetName);
                            if (!responseStatus)
                              break;
                          }
                        }
                      }
                      else {
                        //If no item exists for the tournament in the Tournament Actions list.
                        for (let itemCount = 0; itemCount < tournamentActions.length; itemCount++) {
                          const categoryExists = allActionsItems.filter((action) =>
                            action.Category.trim().replaceAll(" ", "") === tournamentActions[itemCount].category.trim().replaceAll(" ", ""));

                          if (categoryExists.length > 0) {
                            tournamentActions[itemCount].category = categoryExists[0].Category;
                          }
                          responseStatus = await this.createTournamentActions(tournamentActions[itemCount], sheetName);
                          if (!responseStatus)
                            break;
                        }
                      }
                    });
                  if (responseStatus)
                    this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.LogMsgDone + " '" + tournamentName + "' " + LocaleStrings.LogMsgDone1)});
                }
              } else {
                //If 'Tournament Name' is empty
                this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.LogMsgInvalidTournamentName) });
              }
            }
            else {
              //If there is a mismatch in headers when there are more than 1 rows
              this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.LogMsgInvalidTemplate) });
            }
          }
          else {
            //If more than one tournament in Tournament Name column
            this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.LogMsgMultipleTournaments) });
          }
        }
        else {
          //If sheet is blank
          this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.LogMsgBlankSheet) });
        }
      } //End of For loop sheetCount
      this.setState({
        disableForm: false
      });
    }
    catch (error) {
      this.setState({
        disableForm: false,
        importError:
          stringsConstants.TOTErrorMessage +
          " while importing " + sheetName + ". Below are the details: \n" +
          JSON.stringify(error),
      });
      console.error("TOT_TOTCreateTournament_importTournament \n", error);
    }
  }

  //Creating actions in Actions list
  private async createActions(actionData: any, sheetName: string): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      let submitActionsObject: any = {
        Category: actionData.category.trim(),
        Title: actionData.action.trim(),
        Description: actionData.actionDescription.trim(),
        Points: actionData.points,
        HelpURL: actionData.helpUrl
      };
      //Create item in 'Actions' list
      await commonServiceManager
        .createListItem(
          stringsConstants.ActionsMasterList,
          submitActionsObject
        ).then((response) => {
          if (response)
            resolve(true);
        })
        .catch((error) => {
          this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.ErrorMsgActionsList) });
          resolve(false);
        });
    });
  }

  //Creating tournament actions in Tournament Actions list
  private async createTournamentActions(tournamentAction: any, sheetName: string): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      let submitTournamentActionsObject: any = {
        Title: tournamentAction.name.trim(),
        Category: tournamentAction.category.trim(),
        Action: tournamentAction.action.trim(),
        Description: tournamentAction.actionDescription.trim(),
        Points: tournamentAction.points,
        HelpURL: tournamentAction.helpUrl
      };
      //Create item in 'Tournament Actions' list
      await commonServiceManager
        .createListItem(
          stringsConstants.TournamentActionsMasterList,
          submitTournamentActionsObject
        ).then((response) => {
          if (response)
            resolve(true);
        })
        .catch((error) => {
          this.setState({ importLogs: this.state.importLogs.concat(sheetName + ": " + LocaleStrings.ErrorMsgTournamentActionsList) });
          resolve(false);
        });
    });
  }

  //returns message label color in multi tournament screen
  public messageColor = (element: string) => {
    const message = element.split(':')[1].trim();
    if (message === LocaleStrings.ErrorMsgTournamentList.trim() || message === LocaleStrings.ErrorMsgActionsList.trim()
      || message === LocaleStrings.ErrorMsgTournamentActionsList.trim()) {
      return styles.errorRed;
    }
    else if (message.includes(LocaleStrings.LogMsgDone1)) {
      return styles.successGreen;
    }
    else {
      return "";
    }
  }

  //Render Method
  public render(): React.ReactElement<ICreateTournamentProps> {
    const tooltipProps: ITooltipProps = {
      onRenderContent: () => (
        <ol className="createTrmntTooltipInsideContent">
          <li>{LocaleStrings.ImportRule1}</li>
          <li>{LocaleStrings.ImportRule2}</li>
          <li>{LocaleStrings.ImportRule3}</li>
          <li>{LocaleStrings.ImportRule4}</li>
          <li>{LocaleStrings.ImportRule5}</li>
          <li>{LocaleStrings.ImportRule6}</li>
          <li>{LocaleStrings.ImportRule7}</li>
        </ol>
      ),
    };
    return (
      <div className={styles.container}>
        <div className={styles.createTournamentPath}>
          <img src={require("../assets/CMPImages/BackIcon.png")}
            className={styles.backImg}
            alt={LocaleStrings.BackButton}
          />
          <span
            className={styles.backLabel}
            onClick={!this.state.disableForm && (() => this.props.onClickCancel())}
            title={LocaleStrings.TOTBreadcrumbLabel}
          >
            {LocaleStrings.TOTBreadcrumbLabel}
          </span>
          <span className={styles.border} />
          <span className={styles.createTournamentLabel}>{LocaleStrings.CreateTournamentPageTitle}</span>
        </div>
        <Row xl={1} lg={1} md={1} sm={1} xs={1}>
          <Col xl={5} lg={6} md={8} sm={10} xs={12}>
            <div className={styles.toggleTournamentType}>
              <div
                className={`${styles.singleTrmntType} ${this.state.singleTournament ? styles.selectedTrmnt : ""}`}
                onClick={!this.state.disableForm && (() => {
                  this.setState({ singleTournament: true, multipleTournament: false });
                  this.onFileDeselect();
                })}
              >
                {LocaleStrings.SingleTournamentLabel}
              </div>
              <div
                className={`${styles.multipleTrmntType} ${this.state.multipleTournament ? styles.selectedTrmnt : ""}`}
                onClick={() => { this.setState({ singleTournament: false, multipleTournament: true }); }}
              >
                {LocaleStrings.MultipleTournamentLabel}
              </div>
            </div>
          </Col>
        </Row>

        {this.state.singleTournament &&
          <div>
            <div>
              {this.state.showSuccess && (
                <Label className={styles.successMessage}>
                  <img src={require('../assets/TOTImages/tickIcon.png')} alt="tickIcon" className={styles.tickImage} />
                  {LocaleStrings.CreateTournamentSuccessLabel}
                </Label>
              )}

              {this.state.showError && (
                <Label className={styles.errorMessage}>
                  {this.state.errorMessage}
                </Label>
              )}
            </div>

            {this.state.showForm && (
              <div>
                <Row xl={1} lg={1} md={1} sm={1} xs={1}>
                  <Col xl={6} lg={7} md={9} sm={10} xs={12}>
                    <TextField
                      label={LocaleStrings.TournamentNameLabel}
                      required
                      placeholder={LocaleStrings.TournamentNamePlaceHolderLabel}
                      maxLength={255}
                      value={this.state.tournamentName}
                      onChange={(evt) => this.handleInput(evt, "tournamentName")}
                      className={styles.createTrmntTextField}
                    />
                    {this.state.tournamentError && (
                      <Label className={styles.errorMessage}>
                        {LocaleStrings.TournamentNameErrorLabel}
                      </Label>
                    )}
                  </Col>
                </Row>
                <br />
                <Row xl={1} lg={1} md={1} sm={1} xs={1}>
                  <Col xl={6} lg={7} md={9} sm={10} xs={12}>
                    <TextField
                      label={LocaleStrings.TournamentDescriptionLabel}
                      multiline
                      maxLength={500}
                      placeholder={LocaleStrings.TournamentDescPlaceHolderLabel}
                      value={this.state.tournamentDescription}
                      onChange={(evt) =>
                        this.handleInput(evt, "tournamentDescription")
                      }
                      className={styles.createTrmntTextField}
                    />
                  </Col>
                </Row>
                <br />
                <Row xl={1} lg={1} md={1} sm={1} xs={1}>
                  <Col className={styles.treeViewContent} xl={6} lg={7} md={9} sm={10} xs={12}>
                    <div className={styles.selectTeamActionArea}>
                      <Label className={styles.selectTeamActionLabel}>
                        {LocaleStrings.SelectTeamsActionsLabel}{" "}
                        <span className={styles.asteriskStyle}>*</span>
                      </Label>
                      <TooltipHost
                        content={LocaleStrings.TeamsActionInfoToolTip}
                        calloutProps={{ gapSpace: 0 }}
                        hostClassName={styles.createTrmntTooltipHostStyles}
                        delay={window.innerWidth < stringsConstants.MobileWidth ? 0 : 2}
                      >
                        <Icon aria-label="Info" iconName="Info" className={styles.createTrmntSelectTeamsActionInfoIcon} />
                      </TooltipHost>
                    </div>
                    {this.state.actionsList.length > 0 && (
                      <div ref={this.createTrmtTreeViewRef}>
                        <TreeView
                          items={this.state.actionsList}
                          showCheckboxes={true}
                          selectChildrenIfParentSelected={true}
                          selectionMode={TreeViewSelectionMode.Multiple}
                          defaultExpanded={true}
                          onSelect={this.onActionSelected}
                        />
                      </div>
                    )}
                    {this.state.actionsError && (
                      <Label className={styles.errorMessage}>
                        {LocaleStrings.ActionErrorLabel}
                      </Label>
                    )}
                  </Col>
                </Row>
              </div>
            )}
          </div>
        }

        {this.state.multipleTournament &&
          <div className={styles.multipleTrmntArea}>
            <div className={styles.multiTrmntStep}><strong>{LocaleStrings.MultiTournamentStep} 1:</strong> <a href={stringsConstants.MultiTournamentTemplateURL}>{LocaleStrings.MultiTournamentStep1LinkLabel}</a> {LocaleStrings.MultiTournamentStep1Text}</div>
            <div className={styles.multiTrmntStep}>
              <strong>{LocaleStrings.MultiTournamentStep} 2: </strong>
              {LocaleStrings.MultiTournamentStep2}
              <span>
                <TooltipHost
                  tooltipProps={tooltipProps}
                  delay={window.innerWidth < stringsConstants.MobileWidth ? 0 : 2}
                  directionalHint={DirectionalHint.rightCenter}
                  hostClassName={styles.createTrmntTooltipHostStyles}
                >
                  <Icon iconName="Info" className={styles.multiTrmntInfoIcon} />
                </TooltipHost>
              </span>
            </div>
            <div className={styles.multiTrmntStep}><strong>{LocaleStrings.MultiTournamentStep} 3:</strong> {LocaleStrings.MultiTournamentStep3}</div>
            <div className={styles.selectFileArea}>
              <div className={styles.multipleTrmntsFileInput}>
                <input
                  type="file"
                  id="multiple-tournaments-file"
                  className={styles.multipleTrmntsFile}
                  onChange={(evt) => this.onFileSelect(evt)}
                  onClick={this.onFileDeselect}
                  accept=".xls,.xlsx"
                  ref={this.createTrmtFileSelectRef}
                  disabled={this.state.disableForm}
                />
                <label htmlFor="multiple-tournaments-file" title={LocaleStrings.UploadFileButton}>
                  {LocaleStrings.UploadFileButton}
                </label>
              </div>
              {this.state.multipleTrnmtFileName !== "" &&
                <div key={this.state.multipleTrnmtFileName}>
                  <div className={styles.multipleTrmntProgressBarContainer}>
                    <div className={styles.fileNameAndCancelIconArea}>
                      <div className={styles.multipleTrmntsFileName} title={this.state.multipleTrnmtFileName}>
                        {this.state.multipleTrnmtFileName}
                      </div>
                      <div className={styles.cancelIconArea}>
                        <Icon
                          iconName="ChromeClose"
                          title={LocaleStrings.RemoveFileLabel}
                          onClick={this.onFileDeselect}
                          hidden={this.state.disableForm}
                        />
                      </div>
                    </div>
                    <div className={styles.progressBar}>
                      <span className={styles.percentage} />
                    </div>
                    <br />
                    {this.state.disableForm && (
                      <Spinner className={styles.spinnerArea}
                        label={LocaleStrings.ImportSpinnerMessage}
                        size={SpinnerSize.large}
                      />
                    )}
                    <div>
                      {this.state.importError && (
                        <Label className={styles.errorMessage}>
                          {this.state.importError}
                        </Label>
                      )}
                    </div>
                    {this.state.importLogs.length > 0 && (
                      <div className={styles.importLogs}>
                        {LocaleStrings.LogProgress}
                        <ul className={styles.uList}>
                          {this.state.importLogs.map((element) => {
                            return (
                              <li className={this.messageColor(element)}>
                                {element}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              }
            </div>
          </div>
        }
        <div>
          <Row>
            <Col>
              {this.state.singleTournament && this.state.showForm && (
                <PrimaryButton
                  text={LocaleStrings.CreateTournamentButton}
                  title={LocaleStrings.CreateTournamentButton}
                  iconProps={{ iconName: 'Add' }}
                  onClick={this.saveTournament}
                  className={styles.createBtn}
                />
              )}
              {this.state.multipleTournament &&
                <PrimaryButton
                  text={LocaleStrings.CreateTournamentsButton}
                  title={LocaleStrings.CreateTournamentsButton}
                  iconProps={{ iconName: 'Add' }}
                  onClick={this.importTournament}
                  className={styles.createBtn}
                  disabled={this.state.disableCreateTournaments}

                />
              }
              &nbsp; &nbsp;
              <PrimaryButton
                text={LocaleStrings.BackButton}
                title={LocaleStrings.BackButton}
                iconProps={{ iconName: 'NavigateBack' }}
                onClick={() => this.props.onClickCancel()}
                className={styles.createTrnmtBackBtn}
                disabled={this.state.disableForm}
              />
            </Col>
          </Row>
        </div>
      </div> //Final DIV
    );
  }
}
