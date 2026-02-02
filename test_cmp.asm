; Test CMP and Conditional Jumps
ORG 100h

start:
    MOV AX, 10
    MOV BX, 20
    CMP AX, BX      ; 10 - 20, Result negative, ZF=0, CF=1, SF=1
    JL less_than    ; Should jump because 10 < 20 (Signed)
    
    ; If we get here, JL failed
    MOV DX, fail_msg
    MOV AH, 09h
    INT 21h
    HLT

less_than:
    ; Test JNE
    CMP AX, 10      ; 10 - 10, Zero, ZF=1
    JNE fail_jne    ; Should NOT jump
    
    ; Test JA (Unsigned)
    MOV CX, 30
    CMP CX, BX      ; 30 - 20, Positive, CF=0, ZF=0
    JA greater_unsigned ; Should jump
    
    MOV DX, fail_msg
    MOV AH, 09h
    INT 21h
    HLT

fail_jne:
    MOV DX, fail_msg
    MOV AH, 09h
    INT 21h
    HLT

greater_unsigned:
    MOV DX, success_msg
    MOV AH, 09h
    INT 21h
    HLT

fail_msg:
    DB "Test Failed!$"

success_msg:
    DB "Test Passed! CMP & Jumps Work.$"
