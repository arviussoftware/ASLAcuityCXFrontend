class InteractionsModel {
  constructor(
    id,
    callId,
    ucid,
    ani,
    extension,
    audioStartTime,
    audioEndTime,
    personalName,
    agentId,
    agent,
    audioModuleNo,
    audioChannelNo,
    localStartTime,
    localEndTime,
    direction,
    noOfHolds,
    totalHoldTime,
    pbxLoginId,
    duration,
    dnis,
    screenExists,
    screenModule,
    switchId,
    switchCallId,
    switchName,
    fileLocation,
    fileSourceType,
    s3StorageClass,
    sid,
    organizationId,
    organizationName,
    userId,
    user_full_name,
    evaluation_date,
    form_name,
    FormUniqueId,
    EvaluationCount,
    transcriptionfilepath,
    transcription_source_type,
    Platformid,
    appid
    //formAppliedStatus
    // filterField = null,
    // filterValue = null
  ) {
    this.id = id; // Unique identifier for the interaction
    this.callId = callId; // ID of the call
    this.ucid = ucid; // Unique Call Identifier
    this.ani = ani; // Automatic Number Identification
    this.extension = extension; // Call extension
    this.audioStartTime = audioStartTime; // Start time of the audio recording
    this.audioEndTime = audioEndTime; // End time of the audio recording
    this.personalName = personalName; // Name associated with the call
    this.agentId = agentId; // Agent Id handling the interaction
    this.agent = agent;
    this.audioModuleNo = audioModuleNo;
    this.audioChannelNo = audioChannelNo;
    this.localStartTime = localStartTime;
    this.localEndTime = localEndTime;
    this.direction = direction;
    this.noOfHolds = noOfHolds;
    this.totalHoldTime = totalHoldTime;
    this.pbxLoginId = pbxLoginId;
    this.duration = duration;
    this.dnis = dnis;
    this.screenExists = screenExists;
    this.screenModule = screenModule;
    this.switchId = switchId;
    this.switchCallId = switchCallId;
    this.switchName = switchName;
    this.fileLocation = fileLocation;
    this.fileSourceType = fileSourceType;
    this.s3StorageClass = s3StorageClass;
    this.sid = sid;
    this.organizationId = organizationId;
    this.organizationName = organizationName;
    this.userId = userId;
    this.user_full_name = user_full_name;
    this.evaluation_date = evaluation_date;
    this.form_name = form_name;
    this.FormUniqueId = FormUniqueId;
    this.EvaluationCount = EvaluationCount;
    this.transcriptionfilepath = transcriptionfilepath;
    this.transcription_source_type = transcription_source_type;
    this.Platformid = Platformid ?? null;
    this.appid      = appid      ?? null;
    //this.formAppliedStatus = formAppliedStatus; // Status of the form applied
    // this.filterField = filterField; // Additional filter field if needed
    // this.filterValue = filterValue; // Value for the filter field
  }
}

async function setInteractions(recordset) {
  const interactions = recordset.map(
    (i) =>
      new InteractionsModel(
        i.id,
        i.callId,
        i.ucid,
        i.ani,
        i.extension,
        i.audioStartTime,
        i.audioEndTime,
        i.personalName,
        i.agentId,
        i.agent,
        i.audioModuleNo,
        i.audioChannelNo,
        i.localStartTime,
        i.localEndTime,
        i.direction,
        i.noOfHolds,
        i.totalHoldTime,
        i.pbxLoginId,
        i.duration,
        i.dnis,
        i.screenExists,
        i.screenModule,
        i.switchId,
        i.switchCallId ?? i.switchCallid,
        i.switchName,
        i.fileLocation,
        i.fileSourceType,
        i.s3StorageClass,
        i.sid,
        i.organizationId,
        i.organizationName,
        i.userId,
        i.user_full_name,
        i.evaluation_date,
        i.form_name,
        i.FormUniqueId,
        i.EvaluationCount,
        i.transcriptionfilepath,
        i.transcription_source_type ?? null,
        i.Platformid ?? null,
        i.appid      ?? null
        // i.formAppliedStatus,
        // i.filterField,
        // i.filterValue
      )
  );
  return interactions;
}

export { setInteractions };
export default InteractionsModel;
