package org.springframework.samples.petclinic.owner

import java.util.*
import java.util.Optional
import org.springframework.stereotype.Controller
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
class VisitController(private val owners: OwnerRepository) {

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @ModelAttribute("visit")
    fun loadPetWithVisit(@PathVariable("ownerId") ownerId: Int, 
                        @PathVariable petId: Int,
                        model: Map<String, Any>): Visit {

        val owner = owners.findById(ownerId)
            .orElseThrow { IllegalArgumentException(
                "Owner not found with id: ${ownerId}. Please ensure the ID is correct"
            )}

        val pet = owner.getPet(petId)

        // Put attributes in the model
        model["pet"] = pet
        model["owner"] = owner

        // Create and add a new visit to the pet
        val visit = Visit()
        pet.addVisit(visit)
        
        return visit
    }

    @GetMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun initNewVisitForm(): String {
        return "pets/createOrUpdateVisitForm"
    }

    @PostMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun processNewVisitForm(@ModelAttribute owner: Owner, 
                           petId: Int,
                           @Valid visit: Visit,
                           result: BindingResult,
                           redirectAttributes: RedirectAttributes): String {

        if (result.hasErrors()) {
            return "pets/createOrUpdateVisitForm"
        }

        owner.addVisit(petId, visit)
        owners.save(owner)

        redirectAttributes.addFlashAttribute("message", "Your visit has been booked")
        return "redirect:/owners/${owner.id}"
    }
}