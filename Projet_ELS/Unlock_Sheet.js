function unlockSpecificSheet() {
    var ssId = '1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM';
    try {
        var ss = SpreadsheetApp.openById(ssId);
        var sheets = ss.getSheets();

        Logger.log('Opening spreadsheet: ' + ss.getName());

        sheets.forEach(function (sheet) {
            // Remove Sheet Protections
            var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
            sheetProtections.forEach(function (p) {
                if (p.canEdit()) {
                    p.remove();
                    Logger.log('Removed protection for sheet: ' + sheet.getName());
                } else {
                    Logger.log('Skipped protection (no permission) for sheet: ' + sheet.getName());
                }
            });

            // Remove Range Protections
            var rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
            rangeProtections.forEach(function (p) {
                if (p.canEdit()) {
                    p.remove();
                    Logger.log('Removed range protection on sheet: ' + sheet.getName());
                } else {
                    Logger.log('Skipped range protection (no permission) on sheet: ' + sheet.getName());
                }
            });
        });
        Logger.log('All protections processed.');
    } catch (e) {
        Logger.log('Error: ' + e.message);
    }
}
