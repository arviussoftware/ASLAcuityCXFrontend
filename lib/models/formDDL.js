class FormDDL {
  constructor(formId, formName, isSelected, uniqueId,FormVersion , CreatedBy,Creation_date) {
    this.formId = formId;
    this.formName = formName;
    this.isSelected = isSelected;
    this.uniqueId = uniqueId;
    this.FormVersion = FormVersion ? parseFloat(FormVersion).toFixed(2) : "0.00"; // Ensures two decimal points
    this.CreatedBy = CreatedBy;
    this.Creation_date = Creation_date;
  }
}

async function setAllFormInDDL(recordset) {
  const forms = recordset.map((f) => new FormDDL(f.formId, f.formName,f.FormVersion,f.CreatedBy,f.Creation_date));
  return forms;
}

async function setFormWithSelectedStatusInDDL(recordset) {
  const forms = recordset.map(
    (f) => new FormDDL(f.formId, f.formName, f.isSelected, f.uniqueId,f.FormVersion,f.CreatedBy,f.Creation_date)
  );
  return forms;
}

export { setAllFormInDDL, setFormWithSelectedStatusInDDL };
export default FormDDL;
