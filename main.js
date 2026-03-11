const fs = require("fs");
function durationToSeconds(time){
    let parts = time.split(":");
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let s = parseInt(parts[2]);
    return h*3600 + m*60 + s;
}
function getDayName(dateString){
    let d = new Date(dateString);
    let days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return days[d.getDay()];
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    if (!startTime || !endTime) return "0:00:00";

    let [sTimeStr, sPeriod] = startTime.split(" ");
    let [eTimeStr, ePeriod] = endTime.split(" ");

    let [sHour,sMin,sSec] = sTimeStr.split(":").map(Number);
    let [eHour,eMin,eSec] = eTimeStr.split(":").map(Number);

    if(sPeriod.toLowerCase() === "pm" && sHour !== 12) sHour += 12;
    if(sPeriod.toLowerCase() === "am" && sHour === 12) sHour = 0;
    if(ePeriod.toLowerCase() === "pm" && eHour !== 12) eHour += 12;
    if(ePeriod.toLowerCase() === "am" && eHour === 12) eHour = 0;

    let diff = (eHour*3600 + eMin*60 + eSec) - (sHour*3600 + sMin*60 + sSec);
    if(diff < 0) diff += 24*3600;

    let h = Math.floor(diff/3600);
    let m = Math.floor((diff%3600)/60);
    let s = diff%60;

    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    
     function timeToSeconds(t) {
        if (!t) return 0;
        let [timeStr, period] = t.split(" ");
        let [h,m,s] = timeStr.split(":").map(Number);
        if(period.toLowerCase() === "pm" && h !== 12) h += 12;
        if(period.toLowerCase() === "am" && h === 12) h = 0;
        return h*3600 + m*60 + s;
    }

    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    let idleStart = 8*3600;
    let idleEnd = 22*3600;

    let before = Math.max(0, idleStart - startSec);
    let after = Math.max(0, endSec - idleEnd);

    let totalIdle = before + after;

    let h = Math.floor(totalIdle/3600);
    let m = Math.floor((totalIdle%3600)/60);
    let s = totalIdle%60;

    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function hmsToSec(hms){ return hms.split(":").map(Number).reduce((a,v,i)=>a+v*(i===0?3600:i===1?60:1),0);}
    let total = hmsToSec(shiftDuration)-hmsToSec(idleTime);
    if(total<0) total=0;
    let h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    let [h,m,s]=activeTime.split(":").map(Number);
    let seconds=h*3600+m*60+s;

    let d=new Date(date);
    let isEid=(d.getFullYear()===2025 && d.getMonth()===3 && d.getDate()>=10 && d.getDate()<=30); 
    let quotaSec = isEid? 6*3600 : 8*3600 + 24*60;
    return seconds>=quotaSec;

}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

        let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        let existingDate = cols[2];
        if (existingDriverID === shiftObj.driverID && existingDate === shiftObj.date) {
            return {};
        }
    }
    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaValue = metQuota(shiftObj.date, activeTime);
    let hasBonus = false;

    let newRecordObj = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaValue,
        hasBonus: hasBonus
    };

    let newRow =
        newRecordObj.driverID + "," +
        newRecordObj.driverName + "," +
        newRecordObj.date + "," +
        newRecordObj.startTime + "," +
        newRecordObj.endTime + "," +
        newRecordObj.shiftDuration + "," +
        newRecordObj.idleTime + "," +
        newRecordObj.activeTime + "," +
        newRecordObj.metQuota + "," +
        newRecordObj.hasBonus;

    let insertIndex = -1;
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];

        if (existingDriverID === shiftObj.driverID) {
            insertIndex = i;
        }
    }

    if (insertIndex === -1) {
        cleanRows.push(newRow);
    } else {
        cleanRows.splice(insertIndex + 1, 0, newRow);
    }

    let newContent = cleanRows.join("\n");
    fs.writeFileSync(textFile, newContent);

    return newRecordObj;
}


// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    if(!fs.existsSync(textFile)) return false;
    let lines=fs.readFileSync(textFile,"utf-8").trim().split("\n");
    let updated=false;
    for(let i=1;i<lines.length;i++){
        let parts=lines[i].split(",");
        if(parts[0]===driverID && parts[2]===date){
            parts[9]=newValue?"true":"false";
            lines[i]=parts.join(",");
            updated=true;
            break;
        }
    }
    if(updated) fs.writeFileSync(textFile, lines.join("\n"));
    return updated;
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    
    let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");

    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }

    let count = 0;
    let driverFound = false;
    let targetMonth = parseInt(month);

    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");

        let existingDriverID = cols[0].trim();
        let date = cols[2].trim();
        let hasBonus = cols[9].trim().toLowerCase();

        if (existingDriverID === driverID) {
            driverFound = true;

            let dateParts = date.split("-");
            let rowMonth = parseInt(dateParts[1]);

            if (rowMonth === targetMonth && hasBonus === "true") {
                count++;
            }
        }
    }

    if (driverFound === false) {
        return -1;
    }

    return count;

}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    
    if(!fs.existsSync(textFile)) return "0:00:00";

    month = month.toString().padStart(2,"0");
    let lines = fs.readFileSync(textFile,"utf8").trim().split("\n");

    let totalSec = 0;
    function hmsToSec(hms){ return hms.split(":").map(Number).reduce((a,v,i)=>a + v*(i===0?3600:i===1?60:1),0); }

    for(let i=1;i<lines.length;i++){
        let parts = lines[i].split(",");
        if(parts[0].trim() === driverID && parts[2].split("-")[1] === month){
            totalSec += hmsToSec(parts[7]);
        }
    }

    let h = Math.floor(totalSec/3600);
    let m = Math.floor((totalSec%3600)/60);
    let s = totalSec%60;

    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

     let rateContent = fs.readFileSync(rateFile, "utf8");
    let rateRows = rateContent.split("\n");
    let cleanRateRows = [];
    for (let i = 0; i < rateRows.length; i++) {
        if (rateRows[i].trim() !== "") {
            cleanRateRows.push(rateRows[i]);
        }
    }
    let dayOff = "";
    for (let i = 0; i < cleanRateRows.length; i++) {
        let cols = cleanRateRows[i].split(",");
        let existingDriverID = cols[0];
        if (existingDriverID === driverID) {
            dayOff = cols[1];
        }
    }
    let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    let totalSeconds = 0;
    let targetMonth = parseInt(month);
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        let date = cols[2];
        if (existingDriverID === driverID) {
            let dateParts = date.split("-");
            let rowMonth = parseInt(dateParts[1]);
            if (rowMonth === targetMonth) {
                let dayName = getDayName(date);
                if (dayName !== dayOff) {
                    if (date >= "2025-04-10" && date <= "2025-04-30") {
                        totalSeconds = totalSeconds + durationToSeconds("6:00:00");
                    }
                    else {
                        totalSeconds = totalSeconds + durationToSeconds("8:24:00");
                    }
                }
            }
        }
    }
    let bonusSeconds = bonusCount * durationToSeconds("2:00:00");
    totalSeconds = totalSeconds - bonusSeconds;

    if (totalSeconds < 0) {
        totalSeconds = 0;
    }

    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;

    return h + ":" + m.toString().padStart(2,"0") + ":" + s.toString().padStart(2,"0");
}



// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    let content = fs.readFileSync(rateFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        if (existingDriverID === driverID) {
            basePay = parseInt(cols[2]);
            tier = parseInt(cols[3]);
        }
    }
    let actualSeconds = durationToSeconds(actualHours);
    let requiredSeconds = durationToSeconds(requiredHours);
    let allowedMissingHours = 0;
    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }
    let missingSeconds = requiredSeconds - actualSeconds;
    if (tier === 1) {
        allowedMissingHours = 50;
    }
    else if (tier === 2) {
        allowedMissingHours = 20;
    }
    else if (tier === 3) {
        allowedMissingHours = 10;
    }
    else if (tier === 4) {
        allowedMissingHours = 3;
    }
    let allowedMissingSeconds = allowedMissingHours * 3600;
    let remainingMissingSeconds = missingSeconds - allowedMissingSeconds;
    if (remainingMissingSeconds <= 0) {
        return basePay;
    }
    let missinghoursForDeduction = Math.floor(remainingMissingSeconds / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = missinghoursForDeduction * deductionRatePerHour;
    let netPay = basePay - salaryDeduction;
    return netPay;
}


module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
