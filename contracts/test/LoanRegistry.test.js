const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * LoanRegistry Contract Tests
 * 
 * Tests cover:
 * - Deployment and role setup
 * - Loan registration
 * - State transitions
 * - Access control
 * - Event emission
 * - Error cases
 */
describe("LoanRegistry", function () {
    let loanRegistry;
    let owner;
    let registrar;
    let unauthorized;

    // Sample loan data
    const sampleLoan = {
        borrower: null, // Set in beforeEach
        lender: null,   // Set in beforeEach
        principalAmount: ethers.parseEther("10000"),
        interestRateBps: 500, // 5%
        termDays: 365,
        externalId: "LOAN-2024-001"
    };

    beforeEach(async function () {
        // Get signers
        [owner, registrar, unauthorized, sampleLoan.borrower, sampleLoan.lender] =
            await ethers.getSigners();

        // Deploy contract
        const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
        loanRegistry = await LoanRegistry.deploy();
        await loanRegistry.waitForDeployment();

        // Grant registrar role
        const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
        await loanRegistry.grantRole(REGISTRAR_ROLE, registrar.address);
    });

    describe("Deployment", function () {
        it("Should set the deployer as admin", async function () {
            const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
            expect(await loanRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should grant registrar role to deployer", async function () {
            const REGISTRAR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REGISTRAR_ROLE"));
            expect(await loanRegistry.hasRole(REGISTRAR_ROLE, owner.address)).to.be.true;
        });

        it("Should start with zero loans", async function () {
            expect(await loanRegistry.getLoanCount()).to.equal(0);
        });
    });

    describe("Loan Registration", function () {
        it("Should register a loan successfully", async function () {
            const tx = await loanRegistry.connect(registrar).registerLoan(
                sampleLoan.borrower.address,
                sampleLoan.lender.address,
                sampleLoan.principalAmount,
                sampleLoan.interestRateBps,
                sampleLoan.termDays,
                sampleLoan.externalId
            );

            const receipt = await tx.wait();
            expect(await loanRegistry.getLoanCount()).to.equal(1);

            // Check event was emitted
            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanRegistered"
            );
            expect(event).to.not.be.undefined;
        });

        it("Should emit LoanRegistered event with correct data", async function () {
            await expect(
                loanRegistry.connect(registrar).registerLoan(
                    sampleLoan.borrower.address,
                    sampleLoan.lender.address,
                    sampleLoan.principalAmount,
                    sampleLoan.interestRateBps,
                    sampleLoan.termDays,
                    sampleLoan.externalId
                )
            ).to.emit(loanRegistry, "LoanRegistered")
                .withArgs(
                    // loanId is dynamic, so we just check it exists
                    (loanId) => loanId !== ethers.ZeroHash,
                    sampleLoan.borrower.address,
                    sampleLoan.lender.address,
                    sampleLoan.principalAmount,
                    sampleLoan.externalId,
                    (timestamp) => timestamp > 0
                );
        });

        it("Should store loan data correctly", async function () {
            const tx = await loanRegistry.connect(registrar).registerLoan(
                sampleLoan.borrower.address,
                sampleLoan.lender.address,
                sampleLoan.principalAmount,
                sampleLoan.interestRateBps,
                sampleLoan.termDays,
                sampleLoan.externalId
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanRegistered"
            );
            const loanId = event.args[0];

            const loan = await loanRegistry.getLoan(loanId);
            expect(loan.borrower).to.equal(sampleLoan.borrower.address);
            expect(loan.lender).to.equal(sampleLoan.lender.address);
            expect(loan.principalAmount).to.equal(sampleLoan.principalAmount);
            expect(loan.interestRateBps).to.equal(sampleLoan.interestRateBps);
            expect(loan.termDays).to.equal(sampleLoan.termDays);
            expect(loan.externalId).to.equal(sampleLoan.externalId);
            expect(loan.status).to.equal(0); // PENDING
        });

        it("Should reject registration from unauthorized address", async function () {
            await expect(
                loanRegistry.connect(unauthorized).registerLoan(
                    sampleLoan.borrower.address,
                    sampleLoan.lender.address,
                    sampleLoan.principalAmount,
                    sampleLoan.interestRateBps,
                    sampleLoan.termDays,
                    sampleLoan.externalId
                )
            ).to.be.reverted;
        });

        it("Should reject zero borrower address", async function () {
            await expect(
                loanRegistry.connect(registrar).registerLoan(
                    ethers.ZeroAddress,
                    sampleLoan.lender.address,
                    sampleLoan.principalAmount,
                    sampleLoan.interestRateBps,
                    sampleLoan.termDays,
                    sampleLoan.externalId
                )
            ).to.be.revertedWithCustomError(loanRegistry, "InvalidAddress");
        });

        it("Should reject zero principal amount", async function () {
            await expect(
                loanRegistry.connect(registrar).registerLoan(
                    sampleLoan.borrower.address,
                    sampleLoan.lender.address,
                    0,
                    sampleLoan.interestRateBps,
                    sampleLoan.termDays,
                    sampleLoan.externalId
                )
            ).to.be.revertedWithCustomError(loanRegistry, "InvalidAmount");
        });
    });

    describe("State Transitions", function () {
        let loanId;

        beforeEach(async function () {
            const tx = await loanRegistry.connect(registrar).registerLoan(
                sampleLoan.borrower.address,
                sampleLoan.lender.address,
                sampleLoan.principalAmount,
                sampleLoan.interestRateBps,
                sampleLoan.termDays,
                sampleLoan.externalId
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment?.name === "LoanRegistered"
            );
            loanId = event.args[0];
        });

        it("Should allow PENDING → APPROVED transition", async function () {
            await expect(
                loanRegistry.connect(registrar).updateStatus(loanId, 1) // APPROVED
            ).to.emit(loanRegistry, "LoanStatusChanged")
                .withArgs(loanId, 0, 1, registrar.address, (t) => t > 0);

            const loan = await loanRegistry.getLoan(loanId);
            expect(loan.status).to.equal(1);
        });

        it("Should allow APPROVED → ACTIVE transition and set activatedAt", async function () {
            await loanRegistry.connect(registrar).updateStatus(loanId, 1); // APPROVED
            await loanRegistry.connect(registrar).updateStatus(loanId, 2); // ACTIVE

            const loan = await loanRegistry.getLoan(loanId);
            expect(loan.status).to.equal(2);
            expect(loan.activatedAt).to.be.gt(0);
        });

        it("Should emit LoanActivated when transitioning to ACTIVE", async function () {
            await loanRegistry.connect(registrar).updateStatus(loanId, 1);

            await expect(
                loanRegistry.connect(registrar).updateStatus(loanId, 2)
            ).to.emit(loanRegistry, "LoanActivated");
        });

        it("Should reject invalid transitions", async function () {
            // PENDING → ACTIVE is not valid (must go through APPROVED)
            await expect(
                loanRegistry.connect(registrar).updateStatus(loanId, 2)
            ).to.be.revertedWithCustomError(loanRegistry, "InvalidTransition");
        });

        it("Should allow PENDING → CANCELLED", async function () {
            await loanRegistry.connect(registrar).updateStatus(loanId, 5); // CANCELLED

            const loan = await loanRegistry.getLoan(loanId);
            expect(loan.status).to.equal(5);
        });

        it("Should allow ACTIVE → COMPLETED", async function () {
            await loanRegistry.connect(registrar).updateStatus(loanId, 1); // APPROVED
            await loanRegistry.connect(registrar).updateStatus(loanId, 2); // ACTIVE
            await loanRegistry.connect(registrar).updateStatus(loanId, 3); // COMPLETED

            const loan = await loanRegistry.getLoan(loanId);
            expect(loan.status).to.equal(3);
        });

        it("Should allow ACTIVE → DEFAULTED", async function () {
            await loanRegistry.connect(registrar).updateStatus(loanId, 1);
            await loanRegistry.connect(registrar).updateStatus(loanId, 2);
            await loanRegistry.connect(registrar).updateStatus(loanId, 4); // DEFAULTED

            const loan = await loanRegistry.getLoan(loanId);
            expect(loan.status).to.equal(4);
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow pauser to pause", async function () {
            await loanRegistry.connect(owner).pause();
            expect(await loanRegistry.paused()).to.be.true;
        });

        it("Should block registration when paused", async function () {
            await loanRegistry.connect(owner).pause();

            await expect(
                loanRegistry.connect(registrar).registerLoan(
                    sampleLoan.borrower.address,
                    sampleLoan.lender.address,
                    sampleLoan.principalAmount,
                    sampleLoan.interestRateBps,
                    sampleLoan.termDays,
                    sampleLoan.externalId
                )
            ).to.be.reverted;
        });

        it("Should allow operations after unpause", async function () {
            await loanRegistry.connect(owner).pause();
            await loanRegistry.connect(owner).unpause();

            await expect(
                loanRegistry.connect(registrar).registerLoan(
                    sampleLoan.borrower.address,
                    sampleLoan.lender.address,
                    sampleLoan.principalAmount,
                    sampleLoan.interestRateBps,
                    sampleLoan.termDays,
                    sampleLoan.externalId
                )
            ).to.not.be.reverted;
        });
    });

    describe("View Functions", function () {
        it("Should validate transitions correctly", async function () {
            expect(await loanRegistry.isValidTransition(0, 1)).to.be.true;  // PENDING → APPROVED
            expect(await loanRegistry.isValidTransition(0, 2)).to.be.false; // PENDING → ACTIVE (invalid)
            expect(await loanRegistry.isValidTransition(1, 2)).to.be.true;  // APPROVED → ACTIVE
            expect(await loanRegistry.isValidTransition(2, 3)).to.be.true;  // ACTIVE → COMPLETED
            expect(await loanRegistry.isValidTransition(2, 4)).to.be.true;  // ACTIVE → DEFAULTED
        });

        it("Should revert getLoan for non-existent loan", async function () {
            const fakeLoanId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
            await expect(
                loanRegistry.getLoan(fakeLoanId)
            ).to.be.revertedWithCustomError(loanRegistry, "LoanNotFound");
        });
    });
});
