package org.springframework.samples.petclinic.owner

import java.util.Optional
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.validation.BindingResult
import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
class VisitController(private val owners: OwnerRepository) {

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @ModelAttribute("visit")
    fun loadPetWithVisit(@PathVariable("ownerId") ownerId: Int, @PathVariable("petId") petId: Int, model: Map<String, Object>): Visit {
        val owner = owners.findById(ownerId).orElseThrow { IllegalArgumentException(
            "Owner not found with id: $ownerId. Please ensure the ID is correct"
        ) }

        val pet = owner.getPet(petId)
        model["pet"] = pet
        model["owner"] = owner

        val visit = Visit()
        pet.addVisit(visit)
        return visit
    }

    @GetMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun initNewVisitForm(): String {
        return "pets/createOrUpdateVisitForm"
    }

    @PostMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun processNewVisitForm(
        @ModelAttribute owner: Owner,
        @PathVariable petId: Int,
        @Valid visit: Visit,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        if (result.hasErrors()) {
            return "pets/createOrUpdateVisitForm"
        }

        owner.addVisit(petId, visit)
        owners.save(owner)

        redirectAttributes.addFlashAttribute("message", "Your visit has been booked")
        return "redirect:/owners/${owner.id}"
    }
}