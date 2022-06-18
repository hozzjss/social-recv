
;; social-recovery
;; v1 
;; - store and keep track of people's stx balances
;;   . as a member i should be able to make a deposit to my own account
;;   . as a member i should be able to make a withdrawal from my own account
;;   . as a member i should be able to make an internal transfer to other members
;;   . as a member i should be able to make an external transfer to someone else
;; - enable people to control their stx via contract
;; - enable them to recover each other's balances if they lose their keys

;; constants
;;

(define-constant MEMBERS 
    (list 
        'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
        'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC
        'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND
        'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB
    ))


(define-constant CONTRACT (as-contract tx-sender))

;; error codes
;;

(define-constant NOT-MEMBER u1001)
(define-constant NOT-AUTHORIZED u1002)

(define-constant INSUFFICIENT-FUNDS u2001)



;; data maps and vars
;;
(define-map member-balances 
    principal 
    uint)


;; private functions
;;
(define-private (add-member (member principal)) 
    (map-insert member-balances member u0))


;; public functions
;;

(define-public (deposit (amount uint) (to principal))
    (let 
        (
            ;; #[filter(to)]
            (balance (unwrap! (map-get? member-balances to) (err NOT-MEMBER)))
            (new-balance (begin 
                (asserts! (> (stx-get-balance tx-sender) amount) (err INSUFFICIENT-FUNDS))
                (+ balance amount)))
        )
        (map-set member-balances to new-balance)
        (stx-transfer? amount tx-sender CONTRACT)
    )
)

(define-public (external-transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
    (begin 
        (asserts! (is-member tx-sender) (err NOT-MEMBER))
        (asserts! (is-eq tx-sender from contract-caller) (err NOT-AUTHORIZED))
        (let (
            (balance (get-balance from))
            (new-balance 
                (- balance amount))
        )
            (asserts! (>= balance amount) (err INSUFFICIENT-FUNDS))
            (map-set member-balances from new-balance)
            (match memo to-print (print to-print) 0x)
            (as-contract (stx-transfer? amount tx-sender to))
        )
    )
)


(define-public (withdraw (amount uint) (member principal)) 
    (external-transfer amount member member none)
)


(define-read-only (get-balance (member principal)) 
    (default-to u0 (map-get? member-balances member)))

(define-read-only (is-member (account principal)) 
    (is-some (map-get? member-balances account)))

;; init

(map add-member MEMBERS)