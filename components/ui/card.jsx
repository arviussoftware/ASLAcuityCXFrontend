// components\ui\card.jsx

import { cn } from "@/lib/utils"
import CryptoJS from 'crypto-js';
import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, FileCode2, Users2, BriefcaseBusiness, Calculator, ClipboardCheck, ClipboardList } from "lucide-react";


const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
        {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn("font-semibold leading-none tracking-tight", className)}
        {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props} />
))
CardFooter.displayName = "CardFooter"

const CallCard = React.forwardRef(({ className, totalCardData = [], ...props }, ref) => {
    const totalCall = totalCardData[0]?.totalCall ?? 0;
    return (
        <Card className={`shadow-md w-42 h-24 rounded-3xl ${className || ''}`} ref={ref} {...props}>
            <CardHeader className="flex justify-between p-[1.3rem]">
                <div className="flex items-center ">
                    <CardTitle className="text-[#6e8192] mt-[-4px] text-[14px] mr-10">
                        Calls
                    </CardTitle>
                    <Phone className="w-4 h-4 text-[#0067D5] ml-10" />
                </div>
            </CardHeader>
            <CardContent className="flex justify-center text-[#0067D5] items-center font-semibold">
                {totalCall}
            </CardContent>
        </Card>
    )
});
CallCard.displayName = "CallCard";

const AverageCard = React.forwardRef(({ className, totalCardData = [], ...props }, ref) => {
    const totalAverage = totalCardData[0]?.totalAverage ?? 0;
    return (
        <Card className={`shadow-md w-42 h-24 rounded-3xl ${className || ''}`} ref={ref} {...props}>
            <CardHeader className="flex justify-between p-[1.3rem]">
                <div className="flex items-center ">
                    <CardTitle className="text-[#6e8192] mt-[-4px] text-[14px]">
                        Avg. Score
                    </CardTitle>
                    <Calculator className="w-4 h-4 text-[#1DB90A] ml-10" />
                </div>
            </CardHeader>
            <CardContent className="flex justify-center text-[#1DB90A] items-center font-semibold">
                {totalAverage}
            </CardContent>
        </Card>
    )
});
AverageCard.displayName = "AverageCard";

const AssignFormCard = React.forwardRef(({ className, totalCardData = [], ...props }, ref) => {
    const assignForm = totalCardData[0]?.assignForm ?? 0;
    return (
        <Card className={`shadow-md w-42 h-24 rounded-3xl ${className || ''}`} ref={ref} {...props}>
            <CardHeader className="flex justify-between p-[1.3rem]">
                <div className="flex items-center">
                    <CardTitle className="text-[#6e8192] mt-[-4px] text-[14px]">
                        Assign form
                    </CardTitle>
                    <ClipboardList className="w-4 h-4 text-[#0AAA8F] ml-8" />
                </div>
            </CardHeader>
            <CardContent className="flex justify-center text-[#0AAA8F] items-center font-semibold">
                {assignForm}
            </CardContent>
        </Card>
    )
});
AssignFormCard.displayName = "AssignFormCard";

const EvaluatedFormCard = React.forwardRef(({ className, totalCardData = [], ...props }, ref) => {
    const evaluatedForm = totalCardData[0]?.evaluatedForm ?? 0;
    return (
        <Card className={`shadow-md w-42 h-24 rounded-3xl ${className || ''}`} ref={ref} {...props}>
            <CardHeader className="flex justify-between p-[1.3rem]">
                <div className="flex items-center space-x-5">
                    <CardTitle className="text-[#6e8192] mt-[-4px] text-[14px]">
                        Evaluate form
                    </CardTitle>
                    <ClipboardCheck className="w-4 h-4 text-[#D65DB1]" />
                </div>
            </CardHeader>
            <CardContent className="flex justify-center text-[#D65DB1] items-center font-semibold">
                {evaluatedForm}
            </CardContent>
        </Card>
    )
});
EvaluatedFormCard.displayName = "EvaluatedFormCard";

const CountdownCard = React.forwardRef(({ className, totalCardData = [], ...props }, ref) => {
    const { totalUser = 0, totalOrganization = 0 } = totalCardData[0] || {};
    return (
        <Card className={`shadow-md w-42 h-24 rounded-3xl flex flex-col justify-center ${className}`} ref={ref} {...props}>
            <CardHeader className="flex flex-col p-4 space-y-4">
                <div className="flex justify-between items-center shadow-md rounded-2xl space-x-7">
                    <div className="flex items-center space-x-1">
                        <Users2 className="w-4 h-4 text-[#845EC2]" />
                        <CardTitle className="text-[#6e8192] text-[14px]">
                            Users
                        </CardTitle>
                    </div>
                    <CardDescription className=" bg-[#A97BDF] text-[12px] text-white font-bold px-1 rounded-md">
                        {totalUser}
                    </CardDescription>
                </div>
                <div className="flex justify-between items-center shadow-md rounded-2xl">
                    <div className="flex items-center space-x-1">
                        <BriefcaseBusiness className="w-4 h-4 text-[#C34A3F]" />
                        <CardTitle className="text-[#6e8192] text-[14px]">
                            Organization
                        </CardTitle>
                    </div>
                    <CardDescription className="bg-orange-500 text-[12px] text-white font-bold px-1 rounded-md">
                        {totalOrganization}
                    </CardDescription>
                </div>
            </CardHeader>
        </Card>
    );
});
CountdownCard.displayName = "CountdownCard";

const FormCard = React.forwardRef(({ className, totalCardData = [], modelData = [], ...props }, ref) => {
    const router = useRouter();
    const { totalForms = 0, pass = 0, fail = 0 } = totalCardData[0] || {};
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isOverlayVisible, setIsOverlayVisible] = useState(false);

    const toggleModal = (selected) => {
        setSelectedCategory(selected)
        setIsModalVisible(!isModalVisible);
        setIsOverlayVisible(!isOverlayVisible);
    };

    const viewSubmission = async (row) => {
        try {
            const encryptedUserData = sessionStorage.getItem("user");
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            const loggedInUserId = JSON.parse(decryptedData).userId;

            if (!loggedInUserId) {
                console.error("User not logged in.");
                return;
            }

            const response = await fetch(`/api/dashboard/submittedForm/${row.formUniqueId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
                    loggedInUserId: loggedInUserId,
                    interactionId: row.interaction_id,
                },
            });

            const data = await response.json();
            if (response.ok) {
                const formData = data.data[0];
                if (formData) {
                    const encryptedText = CryptoJS.AES.encrypt(JSON.stringify(formData), '').toString();
                    sessionStorage.setItem("submittedFormData", encryptedText);
                    router.push(`/dashboard/submittedForm/${row.formUniqueId}`);
                }
            } else {
                console.error("Error fetching form:", data.message);
            }
        } catch (error) {
            console.error("Error fetching form:", error);
        }
    };

    return (
        <>
            {/* Fullscreen Overlay */}
            {isOverlayVisible && (
                <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-40" onClick={toggleModal}></div>
            )}
            <Card className={`shadow-md w-42 h-24 rounded-3xl ${className} flex flex-col justify-center items-center`} ref={ref} {...props}>
                <CardHeader className="flex flex-col justify-center items-center p-3">
                    <div className="flex items-center space-x-5 justify-center">
                        <div className="flex items-center space-x-1 justify-center">
                            <FileCode2 className="w-4 h-4 text-[#c3a80c] mr-3" />
                            <CardTitle className="text-[#6e8192] text-[14px]">
                                Forms
                            </CardTitle>
                        </div>
                        {/* <CardDescription className="text-[#c3a80c] font-semibold">{totalForms}</CardDescription> */}
                    </div>
                    <hr className="border-t border-border mt-3 w-full" />
                </CardHeader>
                {/* <div onClick={toggleModal}> */}
                <CardContent className="p-6 pt-3 relative -translate-y-5 h-[20px]">
                    <table className="text-[12px] ">
                        <tbody>
                            <tr
                                className="cursor-pointer"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ecffec"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                onClick={() => toggleModal("pass")}
                            >
                                <td className="font-semibold text-[#6e8192]">Pass</td>
                                <td className="pl-[50px] font-semibold text-green-500">{pass}</td>
                            </tr>
                            <tr
                                className="cursor-pointer"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ffeeec"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                onClick={() => toggleModal("fail")}
                            >
                                <td className="font-semibold text-[#6e8192]">Fail</td>
                                <td className="pl-[50px] font-semibold text-[#FA662F]">{fail}</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
                {/* </div> */}

                {/* Clickable Modal */}
                {isModalVisible && (
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card p-6 rounded-lg shadow-lg z-50">
                        <button className="absolute top-2 right-4 text-muted-foreground text-2xl" onClick={toggleModal}>&times;</button>
                        <div className="modal-content">
                            <h2 className="text-[16px] font-bold mb-[10px] text-[#544f4f]">{selectedCategory === "pass" ? "Daily pass forms allocation" : "Daily fail forms allocation"}</h2>
                            <hr className="border-t-2 border-border w-full" />
                            <div className="flex flex-row gap-5 scrollable-div force-overflow" id="style-1">
                                {
                                    selectedCategory === "pass" ? (
                                        <table className="customizedTable">
                                            <thead className="sticky top-0 bg-card">
                                                <tr>
                                                    <th className="p-1 uppercase text-left font-normal text-[#3e3e3e]">Pass Form</th>
                                                    <th className="p-1 uppercase text-left font-normal text-[#3e3e3e]">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modelData.filter((row) => row.passForm).map((row, index) => (
                                                    <tr key={index} className="lineHeight">
                                                        <td className="Customized-td font-semibold" onClick={() => viewSubmission(row)}>
                                                            {row.passForm.length > 30 ? row.passForm.substring(0, 50) + "..." : row.passForm}
                                                        </td>
                                                        <td className="Customized-td font-semibold passForm">{row.passScore}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="customizedTable">
                                            <thead className="sticky top-0 bg-card">
                                                <tr>
                                                    <th className="p-1 uppercase text-left font-normal text-[#3e3e3e]">Fail Form</th>
                                                    <th className="p-1 uppercase text-left font-normal text-[#3e3e3e]">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modelData.filter((row) => row.failForm).map((row, index) => (
                                                    <tr key={index} className="lineHeight">
                                                        <td className="Customized-td font-semibold" onClick={() => viewSubmission(row)}>
                                                            {row.failForm.length > 30 ? row.failForm.substring(0, 50) + "..." : row.failForm}
                                                        </td>
                                                        <td className="Customized-td font-semibold failForm">{row.failScore}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )
                                }


                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </>
    );
});

FormCard.displayName = "FormCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, FormCard, CallCard, AverageCard, AssignFormCard, EvaluatedFormCard, CountdownCard }

