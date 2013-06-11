// Load elf file
//

// loadElf is passed as the callback function to 
// GetBinaryFile
//
// may assume access to RISCV (the processor). setup done in run.html
function loadElf(binfile){
    var binfile_length = binfile.ContentLength;
    var binfile = binfile.Content;

    // remove line for release
    binfiletest = binfile;

    // TODO: ADD var AFTER TESTING DONE
    elf = {};
    var magic = ((binfile.charCodeAt(0) & 0xFF) << 24) | ((binfile.charCodeAt(1) & 0xFF) << 16) |
                ((binfile.charCodeAt(2) & 0xFF) << 8) | (binfile.charCodeAt(3) & 0xFF);
    if (magic === 0x7f454c46){
        console.log("THIS IS AN ELF");
    } else { 
        console.log("NOT AN ELF. ERR");
    }


    // e_ident (16 bytes, ELF identification string)
    elf["magic"] = magic; // magic num to identify ELF files
    elf["ei_class"] = binfile.charCodeAt(4) & 0xFF; // 1 -> 32 bit, 2 -> 64 bit
    elf["ei_data"] = binfile.charCodeAt(5) & 0xFF; // 1 little end, 2 big end
    elf["ei_version"] = binfile.charCodeAt(6) & 0xFF; // currently always 1
    elf["ei_pad"] = binfile.charCodeAt(7) & 0xFF; // marks beginning of padding

    if (elf["ei_data"] === 1){
        var end = "l";
        RISCV.endianness = "little";
    } else if (elf["ei_data"] === 2){
        var end = "b";
        RISCV.endianness = "big";
    } else {
        throw new Error("ELF has invalid endianness");
    }

    // type of object file. should be 2 for executable
    elf["e_type"] = bytes_to_int(binfile, 16, 2, end);
    // architecture
    elf["e_machine"] = bytes_to_int(binfile, 18, 2, end);
    // elf version (should always be 1)
    elf["e_version"] = bytes_to_int(binfile, 20, 4, end);
    // virtual address of entry point into program (0x10000)
    elf["e_entry"] = bytes_to_int(binfile, 24, 4, end);
    // offset for program header
    elf["e_phoff"] = bytes_to_int(binfile, 28, 4, end);
    // offset for section header
    elf["e_shoff"] = bytes_to_int(binfile, 32, 4, end);
    // processor flags
    elf["e_flags"] = bytes_to_int(binfile, 36, 4, end);
    // elf header size
    elf["e_ehsize"] = bytes_to_int(binfile, 40, 2, end);
    // size of each individual entry in program header table
    elf["e_phentsize"] = bytes_to_int(binfile, 42, 2, end);
    // number of entries in program header table
    elf["e_phnum"] = bytes_to_int(binfile, 44, 2, end);
    // size of each individual entry in section header table
    elf["e_shentsize"] = bytes_to_int(binfile, 46, 2, end);
    // number of entries in section header table
    elf["e_shnum"] = bytes_to_int(binfile, 48, 2, end);
    // section header string table index
    elf["e_shstrndx"] = bytes_to_int(binfile, 50, 2, end);

    // copy program into memory
    for (var i = 0x10000; i < 0x11450; i++){
        RISCV.memory[i] = binfile.charCodeAt(i) & 0xFF;
    }

    // copy data into memory
//    for (var i = 0x10fe0; i < 0x11418; i++){
 //       RISCV.memory[i] = binfile.charCodeAt(i) & 0xFF;
  //  }

    RISCV.pc = 0x10000;
    var instVal = RISCV.load_word_from_mem(RISCV.pc);

    // currently stop on a syscall
    while(RISCV.pc < 0x10bd5){
        // run instruction
        var inst = new instruction(instVal);
        runInstruction(inst, RISCV);

        // force x0 to zero
        RISCV.gen_reg[0] = 0x0;

        // update output
        for (var i = 0; i < RISCV.gen_reg.length; i++){
            tab.rows[i+1].cells[1].innerHTML = (RISCV.gen_reg[i]|0).toString();
        }
        console.log(RISCV.pc.toString(16));
        // load next instruction
        instVal = RISCV.load_word_from_mem(RISCV.pc);
    }


}


// load numbytes bytes from input starting at input[addr] using endianness end
// valid values for end: "l": little, "b": big
function bytes_to_int(input, addr, numbytes, end){
    var toArr = [];
    for (var x = 0; x < numbytes; x++){
        toArr.push(input.charCodeAt(addr+x) & 0xFF);
    }
    if (end === "l"){
        toArr = toArr.reverse();
    }
    var output = 0;
    for (var x = 0; x < numbytes; x++){
        output = output | (toArr[x] << (8*(numbytes-1-x)));
    }
    return output;
}